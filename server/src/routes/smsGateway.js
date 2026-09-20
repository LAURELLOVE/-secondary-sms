import { Router } from 'express';
import { AdminStore } from '../data/store.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { PhoneGateway } from '../services/sms/phoneGateway.js';
import { normalizeCameroonPhone } from '../utils/phone.js';

const router = Router();

// ---- Used by the administrator's screen ----

router.get('/status', requireAuth('admin'), async (req, res) => {
  res.json(await PhoneGateway.status());
});

router.put('/settings', requireAuth('admin'), async (req, res) => {
  await PhoneGateway.setEnabled(req.body.enabled === true);
  res.json(await PhoneGateway.status());
});

// A long-lived key that can ONLY collect and report SMS jobs. The phone keeps it so
// sending continues after the admin's normal 8-hour session has ended.
router.post('/token', requireAuth('admin'), (req, res) => {
  const token = signToken({ sub: req.user.sub, role: 'gateway', name: 'SMS gateway' }, '30d');
  res.json({ token });
});

router.post('/test', requireAuth('admin'), async (req, res) => {
  const to = normalizeCameroonPhone(req.body.to);
  if (!to) return res.status(400).json({ error: 'Enter a valid Cameroon phone number, e.g. +237 6XX XXX XXX' });
  try {
    await PhoneGateway.queue(to, 'Test message from your School SMS app. Phone SMS is working.', 'test');
  } catch (err) {
    return res.status(429).json({ error: err.message });
  }
  res.status(202).json({ queued: true });
});

// ---- Used by the phone's background service ----

router.get('/claim', requireAuth('gateway'), async (req, res) => {
  // A removed administrator must not keep a working key.
  if (!(await AdminStore.find(req.user.sub))) return res.status(401).json({ error: 'Gateway key is no longer valid' });
  await PhoneGateway.touch();
  res.json({ messages: await PhoneGateway.claim() });
});

router.post('/:id/result', requireAuth('gateway'), async (req, res) => {
  await PhoneGateway.report(req.params.id, req.body.ok === true, req.body.error);
  res.json({ ok: true });
});

export default router;
