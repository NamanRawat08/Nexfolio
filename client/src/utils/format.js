/**
 * Currency and formatting constants.
 * Using INR (Indian Rupees) with en-IN locale for NSE-style sample data.
 */
const CURRENCY = 'INR';
const LOCALE = 'en-IN';

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  notation: 'compact',
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

// Explicit English 3-letter month table ensuring identical output across all browsers
// (e.g. Chrome otherwise produces "Sept" while Safari produces "Sep" for en-IN)
export const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Local formatters for full ISO timestamp strings (e.g. order timestamps)
const localTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/**
 * Format a monetary value as INR currency string.
 * Accepts string (from DB) or number.
 * @param {string|number} value
 * @param {{ compact?: boolean }} options
 * @returns {string}
 */
export function formatCurrency(value, { compact = false } = {}) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '—';
  return compact ? compactCurrencyFormatter.format(num) : currencyFormatter.format(num);
}

/**
 * Format a monetary value with an explicit '+' for positive values,
 * and formatCurrency's natural '-' for negative values (never doubled).
 * Used uniformly across desktop and mobile wallet/performance cards.
 *
 * @param {string|number} value
 * @param {{ compact?: boolean }} options
 * @returns {string}
 */
export function formatSignedCurrency(value, options) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '—';
  if (num > 0) {
    return `+${formatCurrency(num, options)}`;
  }
  return formatCurrency(num, options);
}

/**
 * Format a decimal ratio as a percentage string.
 * E.g. 0.0512 → "+5.12%", -0.0014 → "-0.14%"
 * @param {string|number} value — a decimal ratio, not already multiplied by 100
 * @returns {string}
 */
export function formatPercent(value) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '—';
  return percentFormatter.format(num);
}

/**
 * Format a date string.
 * - Date-only strings ('YYYY-MM-DD') are parsed as UTC and formatted with timeZone 'UTC'
 *   to ensure identical output ("10 Oct 2026") across all client timezones.
 * - Uses SHORT_MONTHS table for cross-browser uniformity (Sep instead of Sept).
 *
 * @param {string} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const d = new Date(`${dateString}T00:00:00Z`);
    return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Shared short-date helper for chart axis ticks and tooltips.
 * Eliminates all inline toLocaleDateString calls in components.
 * Always handles date-only strings in UTC.
 *
 * @param {string} dateString
 * @param {{ includeDay?: boolean }} options
 * @returns {string}
 */
export function formatChartDate(dateString, { includeDay = true } = {}) {
  if (!dateString) return '';
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  const d = new Date(isDateOnly ? `${dateString}T00:00:00Z` : dateString);
  if (Number.isNaN(d.getTime())) return '';
  const month = SHORT_MONTHS[isDateOnly ? d.getUTCMonth() : d.getMonth()];
  if (!includeDay) return month;
  const day = isDateOnly ? d.getUTCDate() : d.getDate();
  return `${day} ${month}`;
}

/**
 * Format a 'YYYY-MM' month string for chart axis ticks (e.g. "2025-11" -> "Nov").
 * Uses explicit English month table for cross-browser consistency.
 *
 * @param {string} monthKey
 * @returns {string}
 */
export function formatMonthTick(monthKey) {
  if (!monthKey) return '';
  const parts = monthKey.split('-');
  if (parts.length >= 2) {
    const monthIndex = parseInt(parts[1], 10) - 1;
    return SHORT_MONTHS[monthIndex] || monthKey;
  }
  return monthKey;
}

/**
 * Format a 'YYYY-MM' month string for tooltip headers (e.g. "2025-11" -> "Nov 2025",
 * or for current month "2026-10" -> "Oct 2026 (to 26 Oct)").
 * UTC-safe, no hard-coded year.
 *
 * @param {string} monthKey - 'YYYY-MM'
 * @param {{ asOfDate?: string }} [options]
 * @returns {string}
 */
export function formatMonthYear(monthKey, { asOfDate } = {}) {
  if (!monthKey) return '';
  const parts = monthKey.split('-');
  if (parts.length < 2) return monthKey;
  const year = parts[0];
  const monthIndex = parseInt(parts[1], 10) - 1;
  const monthName = SHORT_MONTHS[monthIndex] || '';
  const base = `${monthName} ${year}`;
  if (asOfDate && asOfDate.startsWith(monthKey)) {
    const d = new Date(`${asOfDate}T00:00:00Z`);
    const day = d.getUTCDate();
    const asOfMonth = SHORT_MONTHS[d.getUTCMonth()];
    return `${base} (to ${day} ${asOfMonth})`;
  }
  return base;
}

/**
 * Format an ISO timestamp string to a local short time (e.g. "2:30 PM").
 * @param {string} iso
 * @returns {string}
 */
export function formatTime(iso) {
  return localTimeFormatter.format(new Date(iso));
}

/**
 * Format an ISO timestamp string to local "22 Oct 2026, 2:30 PM".
 * @param {string} iso
 * @returns {string}
 */
export function formatDateTime(iso) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/**
 * Convert monetary string values to numbers for chart display.
 * DISPLAY-ONLY adapter — no financial arithmetic in components.
 * Handles both time-series points (with .value) and monthly performance rows (with .invested, .returns).
 *
 * @param {Array<object>} items
 * @returns {Array<object>}
 */
export function toChartNumbers(items) {
  return items.map((item) => {
    const res = { ...item };
    if ('value' in item && typeof item.value === 'string') {
      res.value = parseFloat(item.value);
    }
    if ('invested' in item && typeof item.invested === 'string') {
      res.invested = parseFloat(item.invested);
    }
    if ('returns' in item && typeof item.returns === 'string') {
      res.returns = parseFloat(item.returns);
    }
    return res;
  });
}
