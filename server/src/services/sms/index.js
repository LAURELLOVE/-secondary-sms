import { sendSmsViaNexah } from './nexahProvider.js';
import { sendSmsViaTwilio } from './twilioProvider.js';
import { sendSmsViaMock } from './mockProvider.js';

const {
  NEXAH_USER, NEXAH_PASSWORD, NEXAH_SENDER_ID,
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER,
} = process.env;

const nexahConfigured = Boolean(NEXAH_USER && NEXAH_PASSWORD && NEXAH_SENDER_ID);
const twilioConfigured = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER);

export const isSmsLive = nexahConfigured || twilioConfigured;
export const activeSmsProvider = nexahConfigured ? 'nexah' : twilioConfigured ? 'twilio' : 'mock';

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
