import { withTransaction as defaultWithTransaction, closePool } from '../src/db/pool.js';
import { instrumentsData } from './instruments.data.js';
import { generateHistory, daysInclusive, MARKET_START_DATE } from './priceGenerator.js';
import { insertPriceRows } from './priceRows.js';
import { runOrderMatching } from '../src/jobs/matchOrders.js';

/**
 * Today's date in UTC as 'YYYY-MM-DD'.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Works out which price rows are missing for each instrument.
 *
 * Every series is a deterministic random walk from MARKET_START_DATE, so generating it through
 * `endDate` reproduces the existing prefix exactly and only the dates after the latest stored
 * date are returned. Instruments that are not in the seed data are skipped.
 *
 * @param {object} params
 * @param {Array<{ id: string|number, symbol: string, latestDate: string|null }>} params.instruments
 * @param {string} params.endDate - 'YYYY-MM-DD'
 * @returns {Array<{ instrumentId: string|number, date: string, closePaise: number }>}
 */
export function planPriceRows({ instruments, endDate }) {
  const baseBySymbol = new Map(instrumentsData.map((i) => [i.symbol.toUpperCase(), i]));
  const days = daysInclusive(MARKET_START_DATE, endDate);
  if (days < 1) return [];

  const rows = [];
  for (const inst of instruments) {
    const seedInfo = baseBySymbol.get(String(inst.symbol).toUpperCase());
    if (!seedInfo) continue;

    const history = generateHistory({
      basePricePaise: seedInfo.basePricePaise,
      seed: seedInfo.symbol,
      days,
      endDate,
    });
    for (const point of history) {
      if (inst.latestDate === null || point.date > inst.latestDate) {
        rows.push({ instrumentId: inst.id, date: point.date, closePaise: point.closePaise });
      }
    }
  }
  return rows;
}

/**
 * Appends simulated daily closes up to `endDate` (default: today, UTC). Safe to run any number
 * of times: it only adds dates after each instrument's latest stored date and never changes
 * existing prices. Everything happens in one transaction.
 *
 * @param {object} [options]
 * @param {string} [options.endDate]
 * @param {Function} [options.withTransaction]
 * @returns {Promise<{ endDate: string, inserted: number }>}
 */
export async function advancePrices({
  endDate = todayUtc(),
  withTransaction = defaultWithTransaction,
} = {}) {
  if (endDate > todayUtc()) {
    throw new Error('endDate cannot be in the future');
  }

  return withTransaction(async (query) => {
    const result = await query(
      `SELECT i.id, i.symbol, to_char(max(p.trade_date), 'YYYY-MM-DD') AS latest_date
       FROM instruments i
       LEFT JOIN price_history p ON p.instrument_id = i.id
       GROUP BY i.id, i.symbol`
    );
    const instruments = result.rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      latestDate: r.latest_date,
    }));

    const rows = planPriceRows({ instruments, endDate });
    const inserted = rows.length > 0 ? await insertPriceRows(query, rows) : 0;
    return { endDate, inserted };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  advancePrices()
    .then(async ({ endDate, inserted }) => {
      console.log(`Prices advanced through ${endDate}: ${inserted} new price history records.`);
      // New prices may have reached open limit orders.
      const { checked, filled, skipped } = await runOrderMatching();
      console.log(`Order matching: ${checked} open, ${filled} filled, ${skipped} skipped.`);
    })
    .catch((err) => {
      console.error('Advancing prices failed:', err && err.message ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => closePool());
}
