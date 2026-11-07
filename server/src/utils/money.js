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

/**
 * Formats integer paise as rupees with Indian digit grouping and two decimals
 * (e.g. '31769400' -> '3,17,694.00', 317694 -> '3,176.94'), matching how the app shows money.
 *
 * @param {string|number|bigint} paise
 * @returns {string}
 */
export function formatRupeesIndian(paise) {
  const plain = formatPaiseToRupees(paise);
  const negative = plain.startsWith('-');
  const [whole, fraction] = (negative ? plain.slice(1) : plain).split('.');
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `${negative ? '-' : ''}${grouped}.${fraction}`;
}

/**
 * Converts a rupee decimal string with at most two decimals to integer paise
 * (e.g. '1234.5' -> 123450n). Strict: no signs, exponents or extra precision.
 *
 * @param {string} rupees
 * @returns {bigint}
 */
export function rupeesToPaise(rupees) {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(rupees));
  if (!match) {
    throw new Error('Invalid rupee amount');
  }
  return BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
}

export default { formatPaiseToRupees, formatRupeesIndian, rupeesToPaise };
