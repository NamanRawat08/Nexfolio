/**
 * Multiplies a rupee decimal string (at most 2 decimals) by a whole quantity using
 * BigInt paise, returning a rupee string. Used only for the order-size estimate;
 * the server computes the real fill.
 *
 * @param {string} rupees - e.g. '2091.81'
 * @param {number} quantity - whole number
 * @returns {string|null} e.g. '20918.10', or null when inputs are invalid
 */
export function multiplyRupees(rupees, quantity) {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(rupees));
  if (!m || !Number.isInteger(quantity) || quantity < 0) return null;
  const paise = BigInt(m[1]) * 100n + BigInt((m[2] ?? '').padEnd(2, '0') || '0');
  const total = paise * BigInt(quantity);
  return `${total / 100n}.${String(total % 100n).padStart(2, '0')}`;
}
