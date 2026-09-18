// Cameroon mobile numbers: +237 followed by 9 digits, always starting with 6
// (covers MTN, Orange, and Nexttel prefixes).
const CAMEROON_PHONE_REGEX = /^\+2376\d{8}$/;

export function normalizeCameroonPhone(input) {
  if (!input) return null;
  let digits = String(input).replace(/[\s-]/g, '');

  if (digits.startsWith('+237')) {
    // already prefixed
  } else if (digits.startsWith('237')) {
    digits = `+${digits}`;
  } else if (digits.startsWith('06') && digits.length === 10) {
    digits = `+237${digits.slice(1)}`;
  } else if (digits.startsWith('6') && digits.length === 9) {
    digits = `+237${digits}`;
  } else {
    return null;
  }

  return CAMEROON_PHONE_REGEX.test(digits) ? digits : null;
}

export function isValidCameroonPhone(input) {
  return normalizeCameroonPhone(input) !== null;
}
