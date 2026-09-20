import { registerPlugin } from '@capacitor/core';

// Native plugin (see android/.../SmsGatewayPlugin.java). In a normal browser every
// call rejects, so screens check Capacitor.isNativePlatform() before using it.
export const SmsGateway = registerPlugin('SmsGateway');
