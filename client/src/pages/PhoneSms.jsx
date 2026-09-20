import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SmsGatewayApi, SERVER_ORIGIN } from '../api';
import { SmsGateway } from '../smsGateway';

const isNative = Capacitor.isNativePlatform();

function ago(value) {
  if (!value) return 'never';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  return new Date(value).toLocaleString();
}

const STATUS_CHIP = { sent: 'chip-ok', failed: 'chip-warn', expired: 'chip-warn', pending: 'chip-late', sending: 'chip-late' };

export default function PhoneSms() {
  const [server, setServer] = useState(null);
  const [phone, setPhone] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState(null);
  const resumed = useRef(false);

  async function refreshServer() {
    try {
      setServer(await SmsGatewayApi.status());
    } catch (err) {
      setError(err.message);
    }
  }

  async function refreshPhone() {
    if (!isNative) return;
    try {
      setPhone(await SmsGateway.status());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    refreshServer();
    refreshPhone();
    const timer = setInterval(() => { refreshServer(); refreshPhone(); }, 4000);
    return () => clearInterval(timer);
  }, []);

  // If Android stopped the sender while it was switched on, bring it back when this screen opens.
  useEffect(() => {
    if (phone && phone.enabled && !phone.running && phone.smsPermission && !resumed.current) {
      resumed.current = true;
      startSending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  async function toggleEnabled() {
    setError('');
    try {
      setServer(await SmsGatewayApi.setEnabled(!server.enabled));
    } catch (err) {
      setError(err.message);
    }
  }

  async function startSending() {
    setBusy(true);
    setError('');
    try {
      const { token } = await SmsGatewayApi.token();
      setPhone(await SmsGateway.start({ baseUrl: SERVER_ORIGIN, token }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function stopSending() {
    setError('');
    try {
      setPhone(await SmsGateway.stop());
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendTest(e) {
    e.preventDefault();
    setTestMessage(null);
    try {
      await SmsGatewayApi.test(testNumber);
      setTestMessage({ ok: true, text: 'Test message queued. It should reach that number within a few seconds.' });
      refreshServer();
    } catch (err) {
      setTestMessage({ ok: false, text: err.message });
    }
  }

  if (!server) return <div className="page"><p className="muted">Loading...</p></div>;

  return (
    <div className="page">
      <h2 className="desktop-only">Phone SMS</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Send teacher sign-in codes as text messages from the SIM card of a phone running this app, so no SMS
        provider is needed.
      </p>

      {error && <p className="error-text">{error}</p>}
      {server.enabled && !server.online && (
        <p className="hint">
          Phone SMS is ON but no phone is connected, so teachers cannot sign in right now. Open the school app on
          the sending phone and press <strong>Start sending</strong>.
        </p>
      )}

      <div className="settings-grid">
        <div className="card settings-card">
          <h3>Teacher sign-in codes</h3>
          <div className="switch-row">
            <div>
              <strong>{server.enabled ? 'Phone SMS is ON' : 'Phone SMS is OFF'}</strong>
              <div className="muted">
                {server.enabled
                  ? 'Teachers get a 6-digit code by SMS after entering their phone and access code.'
                  : 'Teachers sign in with just their phone number and access code.'}
              </div>
            </div>
            <button
              role="switch"
              aria-checked={server.enabled}
              className={`switch ${server.enabled ? 'on' : ''}`}
              onClick={toggleEnabled}
            >
              <span />
            </button>
          </div>
          <div className="status-line">
            <span className={`dot ${server.online ? 'dot-ok' : 'dot-off'}`} />
            {server.online ? 'A phone is connected and ready to send' : 'No phone is connected'}
            <span className="muted"> • last contact {ago(server.lastSeenAt)}</span>
          </div>
          {server.waiting > 0 && <div className="muted">{server.waiting} message(s) waiting to be sent</div>}
        </div>

        <div className="card settings-card">
          <h3>This phone</h3>
          {!isNative ? (
            <p className="muted">
              To make a phone send the texts, open the <strong>School SMS Android app</strong> on it, sign in as
              administrator, and come to this screen. A web browser cannot send SMS.
            </p>
          ) : !phone ? (
            <p className="muted">Checking...</p>
          ) : (
            <>
              <div className="status-line">
                <span className={`dot ${phone.running ? 'dot-ok' : 'dot-off'}`} />
                {phone.running ? 'Sending service is running' : 'Sending service is stopped'}
              </div>
              <div className="muted">
                Sent {phone.sent} • Failed {phone.failed}
                {phone.lastSentAt ? ` • last sent ${ago(phone.lastSentAt)}` : ''}
              </div>
              {phone.lastError && <p className="error-text">{phone.lastError}</p>}

              {phone.running ? (
                <button className="btn-secondary" onClick={stopSending}>Stop sending</button>
              ) : (
                <button className="btn-primary" disabled={busy} onClick={startSending}>
                  {busy ? 'Starting...' : 'Start sending from this phone'}
                </button>
              )}

              <ul className="checklist">
                <li className={phone.smsPermission ? 'done' : ''}>
                  {phone.smsPermission ? 'SMS permission allowed' : 'Allow the SMS permission when Android asks'}
                  {!phone.smsPermission && (
                    <button className="link-btn" onClick={() => SmsGateway.openAppSettings()}>Open app settings</button>
                  )}
                </li>
                <li className={phone.batteryUnrestricted ? 'done' : ''}>
                  {phone.batteryUnrestricted ? 'Battery: not restricted' : 'Set battery to "Unrestricted" so Android keeps it running'}
                  {!phone.batteryUnrestricted && (
                    <button className="link-btn" onClick={() => SmsGateway.openBatterySettings()}>Open battery settings</button>
                  )}
                </li>
                <li>Keep the phone charged, with airtime or an SMS bundle and mobile data or Wi-Fi.</li>
              </ul>
              <p className="muted">
                If Android says <em>"Restricted setting"</em> when you allow SMS: open App info, tap the ⋮ menu at the
                top right, choose <strong>Allow restricted settings</strong>, then try again.
              </p>
            </>
          )}
        </div>

        <form className="card settings-card" onSubmit={sendTest}>
          <h3>Send a test message</h3>
          <label>
            Phone number to text
            <input
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              inputMode="tel"
              required
            />
          </label>
          {testMessage && <p className={testMessage.ok ? 'ok-text' : 'error-text'}>{testMessage.text}</p>}
          <button type="submit" className="btn-primary">Send test SMS</button>
        </form>
      </div>

      <h3 style={{ marginTop: 24 }}>Recent messages</h3>
      {server.recent.length === 0 ? (
        <p className="empty">No messages yet</p>
      ) : (
        <ul className="list card">
          {server.recent.map((m) => (
            <li key={m.id} className="list-row">
              <div>
                <strong>{m.to}</strong>
                <div className="muted">
                  {m.kind === 'test' ? 'Test message' : 'Sign-in code'} • {ago(m.createdAt)}
                  {m.error ? ` • ${m.error}` : ''}
                </div>
              </div>
              <span className={`chip ${STATUS_CHIP[m.status] || ''}`}>{m.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
