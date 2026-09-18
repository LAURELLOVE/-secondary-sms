// Used until real Nexah credentials are configured in .env.
// Logs the message to the server console instead of sending a real SMS.
export async function sendSmsViaMock(mobile, message) {
  console.log(`[MOCK SMS] To: ${mobile} | Message: ${message}`);
  return { provider: 'mock' };
}
