// Excludes 0/O and 1/I so a code read aloud or handwritten isn't ambiguous.
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateAccessCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}
