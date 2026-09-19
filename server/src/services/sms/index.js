import { sendSmsViaNexah } from './nexahProvider.js';
import { sendSmsViaTwilio } from './twilioProvider.js';
import { sendSmsViaMock } from './mockProvider.js';

// Values pasted into a hosting dashboard often pick up stray whitespace or
// wrapping quotes/backticks; strip those so credentials still match exactly.
const clean = (value) => (value || '').trim().replace(/^[`'"]+|[`'"]+$/g, '').trim();

const NEXAH_USER = clean(process.env.NEXAH_USER);
const NEXAH_PASSWORD = clean(process.env.NEXAH_PASSWORD);
const NEXAH_SENDER_ID = clean(process.env.NEXAH_SENDER_ID);
const TWILIO_ACCOUNT_SID = clean(process.env.TWILIO_ACCOUNT_SID);
const TWILIO_AUTH_TOKEN = clean(process.env.TWILIO_AUTH_TOKEN);
const TWILIO_FROM_NUMBER = clean(process.env.TWILIO_FROM_NUMBER);

// SMS_PROVIDER=mock forces on-screen OTPs without having to delete credentials.
const forceMock = clean(process.env.SMS_PROVIDER).toLowerCase() === 'mock';

const nexahConfigured = !forceMock && Boolean(NEXAH_USER && NEXAH_PASSWORD && NEXAH_SENDER_ID);
const twilioConfigured = !forceMock && Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER);

export const isSmsLive = nexahConfigured || twilioConfigured;
export const activeSmsProvider = nexahConfigured ? 'nexah' : twilioConfigured ? 'twilio' : 'mock';

// Teachers sign in with phone + access code only, unless OTP_LOGIN=on adds the
// second step (an SMS code). Turn it on once a paid SMS provider is connected.
export const otpLoginEnabled = clean(process.env.OTP_LOGIN).toLowerCase() === 'on';

export async function sendSms(mobile, message) {
  if (nexahConfigured) {
    return sendSmsViaNexah(
      { user: NEXAH_USER, password: NEXAH_PASSWORD, senderId: NEXAH_SENDER_ID },
      mobile,
      message
    );
  }
  if (twilioConfigured) {
    return sendSmsViaTwilio(
      { accountSid: TWILIO_ACCOUNT_SID, authToken: TWILIO_AUTH_TOKEN, fromNumber: TWILIO_FROM_NUMBER },
      mobile,
      message
    );
  }
  return sendSmsViaMock(mobile, message);
}
