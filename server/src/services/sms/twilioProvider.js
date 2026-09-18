// Twilio REST API - Account SID + Auth Token via HTTP Basic Auth, form-encoded body.
// https://www.twilio.com/docs/sms/quickstart/node
export async function sendSmsViaTwilio({ accountSid, authToken, fromNumber }, mobile, message) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({ To: mobile, From: fromNumber, Body: message });
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Twilio request failed with status ${res.status}`);
  }

  return { provider: 'twilio', raw: data };
}
