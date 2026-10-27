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

// Formatters for date-only strings (YYYY-MM-DD) pinned to UTC
const utcFullDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const utcShortDateWithDay = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const utcShortDateMonthOnly = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  timeZone: 'UTC',
});

// Local formatters for full ISO timestamp strings (e.g. order timestamps)
const localFullDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

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
 * Format a date string.
 * - Date-only strings ('YYYY-MM-DD') are parsed as UTC and formatted with timeZone 'UTC'
 *   to ensure identical output ("10 Oct 2026") across all client timezones.
 * - Full ISO timestamps preserve the user's local timezone.
 *
 * @param {string} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return utcFullDateFormatter.format(new Date(`${dateString}T00:00:00Z`));
  }
  return localFullDateFormatter.format(new Date(dateString));
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
  return includeDay ? utcShortDateWithDay.format(d) : utcShortDateMonthOnly.format(d);
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
 * @param {Array<{date: string, value: string}>} points
 * @returns {Array<{date: string, value: number}>}
 */
export function toChartNumbers(points) {
  return points.map((p) => ({
    ...p,
    value: parseFloat(p.value),
  }));
}
