/**
 * Formats an integer paise amount as a rupee decimal string with two places
 * (e.g. '100000000' -> '1000000.00'). Uses BigInt so large balances never lose precision.
 *
 * @param {string|number|bigint} paise
 * @returns {string}
 */
export function formatPaiseToRupees(paise) {
  const value = BigInt(paise);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const rupees = abs / 100n;
  const rem = abs % 100n;
  return `${negative ? '-' : ''}${rupees}.${String(rem).padStart(2, '0')}`;
}

export default { formatPaiseToRupees };
