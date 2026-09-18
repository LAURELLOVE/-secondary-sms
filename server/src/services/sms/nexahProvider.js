const SEND_URL = 'https://smsvas.com/bulk/public/index.php/api/v1/sendsms';

// Nexah routes SMS locally to both MTN Cameroon and Orange Cameroon.
// Verified against the published Nexah BulkSMS API (user/password/senderid/sms/mobiles,
// JSON body, responsecode + per-number status in the "sms" array of the response).
export async function sendSmsViaNexah({ user, password, senderId }, mobile, message) {
  const res = await fetch(SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      user,
      password,
      senderid: senderId,
      sms: message,
      mobiles: mobile,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (data.responsecode === 0) {
    throw new Error(data.responsemessage || 'Nexah authentication failed');
  }

  const entry = Array.isArray(data.sms) ? data.sms[0] : null;
  if (entry && entry.status === 'error') {
    throw new Error(entry.description || `Failed to send SMS to ${mobile}`);
  }

  return { provider: 'nexah', raw: data };
}
