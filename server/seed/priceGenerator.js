/**
 * Pure Mulberry32 PRNG generator.
 * Produces deterministic pseudo-random float values in [0, 1).
 *
 * @param {number} seed
 * @returns {() => number}
 */
export function createMulberry32(seed) {
  let a = seed >>> 0;
  return function mulberry32() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Derives a 32-bit unsigned integer seed from a string identifier (e.g. symbol).
 *
 * @param {string} str
 * @returns {number}
 */
export function seedFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash >>> 0;
}

/**
 * Formats an integer amount of paise into a standard decimal currency string with 2 decimal places.
 * Uses integer arithmetic exclusively; never invokes parseFloat or floating point division rounding.
 *
 * @param {number} paise
 * @returns {string} e.g. 123456 -> "1234.56", 5 -> "0.05"
 */
export function formatPaiseToRupees(paise) {
  const p = Math.trunc(paise);
  const sign = p < 0 ? '-' : '';
  const abs = Math.abs(p);
  const rupees = Math.floor(abs / 100);
  const remainder = abs % 100;
  const remainderStr = remainder < 10 ? `0${remainder}` : `${remainder}`;
  return `${sign}${rupees}.${remainderStr}`;
}

const MS_PER_DAY = 86400000;

/**
 * First day of every instrument's simulated price series. All series are random walks
 * from this date, so extending the end date never changes earlier prices.
 */
export const MARKET_START_DATE = '2025-10-26';

/**
 * Number of calendar days from startDate to endDate, inclusive.
 *
 * @param {string} startDate - 'YYYY-MM-DD'
 * @param {string} endDate - 'YYYY-MM-DD'
 * @returns {number}
 */
export function daysInclusive(startDate, endDate) {
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / MS_PER_DAY) + 1;
}

/**
 * Generates a deterministic price history for an instrument over consecutive calendar days.
 *
 * @param {object} params
 * @param {number} params.basePricePaise - Starting/base price in integer paise
 * @param {number|string} [params.seed] - Deterministic PRNG seed (number or string)
 * @param {number} [params.days=366] - Number of consecutive calendar days
 * @param {string} [params.endDate='2026-10-26'] - Final date in 'YYYY-MM-DD' format (UTC)
 * @returns {Array<{ date: string, closePaise: number }>}
 */
export function generateHistory({
  basePricePaise,
  seed = 42,
  days = 366,
  endDate = '2026-10-26',
}) {
  if (!Number.isInteger(basePricePaise) || basePricePaise < 100) {
    throw new Error('basePricePaise must be an integer >= 100');
  }
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('days must be a positive integer');
  }

  const seedNum = typeof seed === 'string' ? seedFromString(seed) : (seed >>> 0);
  const rng = createMulberry32(seedNum);

  const [endY, endM, endD] = endDate.split('-').map(Number);
  const endUtcMs = Date.UTC(endY, endM - 1, endD);
  const startUtcMs = endUtcMs - (days - 1) * MS_PER_DAY;

  const history = [];
  let currentPrice = Math.trunc(basePricePaise);

  for (let i = 0; i < days; i++) {
    const dayUtcMs = startUtcMs + i * MS_PER_DAY;
    const dateStr = new Date(dayUtcMs).toISOString().slice(0, 10);

    if (i > 0) {
      // Daily move bounded to +/- 3 percent: movePercent in [-0.03, +0.03]
      const movePercent = (rng() * 6 - 3) / 100;
      const delta = Math.trunc(currentPrice * movePercent);
      currentPrice = Math.max(100, currentPrice + delta);
    }

    history.push({
      date: dateStr,
      closePaise: currentPrice,
    });
  }

  return history;
}

export default {
  MARKET_START_DATE,
  daysInclusive,
  createMulberry32,
  seedFromString,
  formatPaiseToRupees,
  generateHistory,
};
