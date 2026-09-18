// Central African CFA franc (XAF) - the currency used in Cameroon.
// No decimal subunit in everyday use, so amounts are shown as whole numbers.
export function formatFCFA(amount) {
  const rounded = Math.round(Number(amount) || 0);
  return `${rounded.toLocaleString('en-US')} FCFA`;
}
