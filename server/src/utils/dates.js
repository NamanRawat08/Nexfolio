const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats a 'YYYY-MM-DD' date as '3 Nov 2026'. Anything else is returned unchanged.
 *
 * @param {string} date
 * @returns {string}
 */
export function formatShortDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date));
  if (!m) return String(date);
  const month = SHORT_MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : String(date);
}
