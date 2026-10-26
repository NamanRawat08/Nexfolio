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
 * Format a decimal ratio as a percentage string.
 * E.g. 0.0512 → "+5.12%"
 * @param {string|number} value — a decimal ratio, not already multiplied by 100
 * @returns {string}
 */
export function formatPercent(value) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '—';
  return percentFormatter.format(num);
}

/**
 * Format an ISO date string to a short date (e.g. "22 Oct 2026").
 * @param {string} iso
 * @returns {string}
 */
export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format an ISO date string to a short time (e.g. "2:30 PM").
 * @param {string} iso
 * @returns {string}
 */
export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format an ISO date string to "22 Oct, 2:30 PM".
 * @param {string} iso
 * @returns {string}
 */
export function formatDateTime(iso) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/**
 * Convert monetary string values to numbers for chart display.
 * This is DISPLAY-ONLY — no financial arithmetic should happen in components.
 * @param {Array<{date: string, value: string}>} points
 * @returns {Array<{date: string, value: number}>}
 */
export function toChartNumbers(points) {
  return points.map((p) => ({
    ...p,
    value: parseFloat(p.value),
  }));
}
