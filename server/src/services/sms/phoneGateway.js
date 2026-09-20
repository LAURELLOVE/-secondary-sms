import { randomUUID } from 'node:crypto';
import { getDb } from '../../data/db.js';

// "Phone SMS": instead of paying an SMS provider, the administrator's Android phone
// sends the texts from its own SIM. The server only keeps a queue; the phone (the
// Android app running its SMS gateway service) picks messages up, sends them and
// reports back.

const col = (name) => getDb().collection(name);

const SETTINGS_KEY = 'phoneSms';
const ONLINE_WINDOW_MS = 30 * 1000; // the phone polls every few seconds
const MAX_AGE_MS = 5 * 60 * 1000; // a sign-in code is useless after 5 minutes
const CLAIM_TIMEOUT_MS = 90 * 1000; // handed to the phone but never confirmed
const KEEP_MS = 24 * 60 * 60 * 1000;
const MAX_WAITING = 20; // protects the SIM's airtime from a flood of requests

const settingsDoc = () => col('settings').findOne({ key: SETTINGS_KEY }, { projection: { _id: 0 } });

export const PhoneGateway = {
  async isEnabled() {
    return (await settingsDoc())?.enabled === true;
  },

  async setEnabled(enabled) {
    await col('settings').updateOne({ key: SETTINGS_KEY }, { $set: { enabled: Boolean(enabled) } }, { upsert: true });
  },

  // Called every time the phone asks for work, so "online" means "polled recently".
  async touch() {
    await col('settings').updateOne({ key: SETTINGS_KEY }, { $set: { lastSeenAt: new Date() } }, { upsert: true });
  },

  async isOnline() {
    const lastSeenAt = (await settingsDoc())?.lastSeenAt;
    return Boolean(lastSeenAt) && Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
  },

  async queue(to, body, kind = 'otp') {
    const waiting = await col('sms_outbox').countDocuments({ status: { $in: ['pending', 'sending'] } });
    if (waiting >= MAX_WAITING) throw new Error('Too many messages are waiting to be sent. Try again in a minute.');
    const message = { id: randomUUID(), to, body, kind, status: 'pending', createdAt: new Date() };
    await col('sms_outbox').insertOne({ ...message });
    return message.id;
  },

  // Hands the oldest waiting messages to the phone (each one to exactly one poll).
  async claim(limit = 5) {
    const now = Date.now();
    const outbox = col('sms_outbox');
    // Message text holds a sign-in code, so wipe it as soon as it is no longer needed.
    await outbox.updateMany(
      { status: 'pending', createdAt: { $lt: new Date(now - MAX_AGE_MS) } },
      { $set: { status: 'expired', body: null, finishedAt: new Date() } }
    );
    await outbox.updateMany(
      { status: 'sending', claimedAt: { $lt: new Date(now - CLAIM_TIMEOUT_MS) } },
      { $set: { status: 'failed', error: 'The phone did not confirm sending', body: null, finishedAt: new Date() } }
    );
    await outbox.deleteMany({ createdAt: { $lt: new Date(now - KEEP_MS) } });

    const claimed = [];
    for (let i = 0; i < limit; i += 1) {
      const doc = await outbox.findOneAndUpdate(
        { status: 'pending' },
        { $set: { status: 'sending', claimedAt: new Date() } },
        { sort: { createdAt: 1 }, returnDocument: 'after', projection: { _id: 0, id: 1, to: 1, body: 1 } }
      );
      if (!doc) break;
      claimed.push(doc);
    }
    return claimed;
  },

  async report(id, ok, error) {
    const result = await col('sms_outbox').updateOne(
      { id, status: 'sending' },
      { $set: { status: ok ? 'sent' : 'failed', error: ok ? null : String(error || 'Failed').slice(0, 200), body: null, finishedAt: new Date() } }
    );
    return result.matchedCount > 0;
  },

  // Never includes message text (it contains sign-in codes).
  async status() {
    const [doc, waiting, recent] = await Promise.all([
      settingsDoc(),
      col('sms_outbox').countDocuments({ status: { $in: ['pending', 'sending'] } }),
      col('sms_outbox')
        .find({}, { projection: { _id: 0, id: 1, to: 1, kind: 1, status: 1, error: 1, createdAt: 1 } })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
    ]);
    const lastSeenAt = doc?.lastSeenAt || null;
    return {
      enabled: doc?.enabled === true,
      online: Boolean(lastSeenAt) && Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS,
      lastSeenAt,
      waiting,
      recent,
    };
  },
};
