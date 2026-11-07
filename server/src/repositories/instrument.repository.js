import { query as defaultQuery } from '../db/pool.js';

/**
 * Escapes special wildcard characters for SQL LIKE/ILIKE queries with ESCAPE '\'.
 * Escapes '\', '%', and '_'.
 *
 * @param {string} input
 * @returns {string}
 */
export function escapeLike(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Day count mapping for supported historical ranges.
 */
export const RANGE_DAYS = Object.freeze({
  '1M': 30,
  '3M': 90,
  '6M': 183,
  '1Y': 365,
});

/**
 * Lists market instruments with their latest and previous close prices.
 * Supports optional search filtering by symbol or name and pagination.
 *
 * @param {object} [options={}]
 * @param {string} [options.search] - Search term
 * @param {number} [options.limit=50] - Result limit
 * @param {number} [options.offset=0] - Result offset
 * @param {Function} [query=defaultQuery] - Injected query function
 * @returns {Promise<Array<{ id: string|number, symbol: string, name: string, sector: string, latestClose: string|null, previousClose: string|null, latestTradeDate: string|null }>>}
 */
export async function listInstruments(
  { search, limit = 50, offset = 0 } = {},
  query = defaultQuery
) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const safeOffset = Math.max(0, Number(offset) || 0);

  let searchParam = null;
  if (typeof search === 'string' && search.trim() !== '') {
    searchParam = `%${escapeLike(search.trim())}%`;
  }

  const sql = `
    SELECT 
      i.id,
      i.symbol,
      i.name,
      i.sector,
      lh.latest_close,
      lh.latest_trade_date,
      lh.previous_close
    FROM instruments i
    LEFT JOIN LATERAL (
      SELECT 
        p1.close_price::text AS latest_close,
        to_char(p1.trade_date, 'YYYY-MM-DD') AS latest_trade_date,
        (
          SELECT p2.close_price::text
          FROM price_history p2
          WHERE p2.instrument_id = i.id AND p2.trade_date < p1.trade_date
          ORDER BY p2.trade_date DESC
          LIMIT 1
        ) AS previous_close
      FROM price_history p1
      WHERE p1.instrument_id = i.id
      ORDER BY p1.trade_date DESC
      LIMIT 1
    ) lh ON true
    WHERE ($1::text IS NULL OR i.symbol ILIKE $1 ESCAPE '\\' OR i.name ILIKE $1 ESCAPE '\\')
    ORDER BY i.symbol ASC
    LIMIT $2 OFFSET $3
  `;

  const result = await query(sql, [searchParam, safeLimit, safeOffset]);

  return result.rows.map((row) => ({
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    sector: row.sector,
    latestClose: row.latest_close !== null ? String(row.latest_close) : null,
    previousClose: row.previous_close !== null ? String(row.previous_close) : null,
    latestTradeDate: row.latest_trade_date ?? null,
  }));
}

/**
 * Finds an instrument by its symbol (case-insensitive) including latest and previous close prices.
 *
 * @param {string} symbol - Instrument symbol (e.g. 'RELIANCE')
 * @param {Function} [query=defaultQuery] - Injected query function
 * @returns {Promise<{ id: string|number, symbol: string, name: string, sector: string, latestClose: string|null, previousClose: string|null, latestTradeDate: string|null } | null>}
 */
export async function findBySymbol(symbol, query = defaultQuery) {
  if (typeof symbol !== 'string' || symbol.trim() === '') {
    return null;
  }

  const sql = `
    SELECT 
      i.id,
      i.symbol,
      i.name,
      i.sector,
      lh.latest_close,
      lh.latest_trade_date,
      lh.previous_close
    FROM instruments i
    LEFT JOIN LATERAL (
      SELECT 
        p1.close_price::text AS latest_close,
        to_char(p1.trade_date, 'YYYY-MM-DD') AS latest_trade_date,
        (
          SELECT p2.close_price::text
          FROM price_history p2
          WHERE p2.instrument_id = i.id AND p2.trade_date < p1.trade_date
          ORDER BY p2.trade_date DESC
          LIMIT 1
        ) AS previous_close
      FROM price_history p1
      WHERE p1.instrument_id = i.id
      ORDER BY p1.trade_date DESC
      LIMIT 1
    ) lh ON true
    WHERE upper(i.symbol) = upper($1)
    LIMIT 1
  `;

  const result = await query(sql, [symbol.trim()]);
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    sector: row.sector,
    latestClose: row.latest_close !== null ? String(row.latest_close) : null,
    previousClose: row.previous_close !== null ? String(row.previous_close) : null,
    latestTradeDate: row.latest_trade_date ?? null,
  };
}

/**
 * Retrieves historical close prices for an instrument counted back from its latest trade_date.
 *
 * @param {string} symbol - Instrument symbol
 * @param {string} [range='1Y'] - Range string ('1M', '3M', '6M', '1Y')
 * @param {Function} [query=defaultQuery] - Injected query function
 * @returns {Promise<Array<{ date: string, close: string }>>}
 */
export async function getHistory(symbol, range = '1Y', query = defaultQuery) {
  if (typeof symbol !== 'string' || symbol.trim() === '') {
    return [];
  }

  const normalizedRange = String(range).toUpperCase();
  const dayCount = RANGE_DAYS[normalizedRange];
  if (!dayCount) {
    throw new Error(`Invalid range: ${range}. Must be one of 1M, 3M, 6M, 1Y`);
  }

  const sql = `
    WITH latest AS (
      SELECT max(ph.trade_date) AS max_date
      FROM price_history ph
      JOIN instruments i ON i.id = ph.instrument_id
      WHERE upper(i.symbol) = upper($1)
    )
    SELECT 
      to_char(ph.trade_date, 'YYYY-MM-DD') AS date,
      ph.close_price::text AS close
    FROM price_history ph
    JOIN instruments i ON i.id = ph.instrument_id
    CROSS JOIN latest l
    WHERE upper(i.symbol) = upper($1)
      AND l.max_date IS NOT NULL
      AND ph.trade_date >= (l.max_date - ($2::int - 1) * INTERVAL '1 day')
    ORDER BY ph.trade_date ASC
  `;

  const result = await query(sql, [symbol.trim(), dayCount]);

  return result.rows.map((row) => ({
    date: row.date,
    close: String(row.close),
  }));
}

/**
 * Lists the most recent distinct trading dates across all instruments, oldest first.
 *
 * @param {number} limit - Maximum number of dates
 * @param {Function} [query=defaultQuery]
 * @returns {Promise<string[]>} 'YYYY-MM-DD' strings
 */
export async function listTradeDates(limit, query = defaultQuery) {
  const result = await query(
    `SELECT to_char(d, 'YYYY-MM-DD') AS date
     FROM (SELECT DISTINCT trade_date AS d FROM price_history ORDER BY d DESC LIMIT $1) t
     ORDER BY d ASC`,
    [Math.max(1, Math.min(1000, Number(limit) || 366))]
  );
  return result.rows.map((row) => row.date);
}

/**
 * Close prices in integer paise for the given instruments from a start date onward.
 *
 * @param {Array<string|number>} instrumentIds
 * @param {string} fromDate - 'YYYY-MM-DD'
 * @param {Function} [query=defaultQuery]
 * @returns {Promise<Array<{ instrumentId: string, date: string, closePaise: string }>>}
 */
export async function getClosesForInstruments(instrumentIds, fromDate, query = defaultQuery) {
  if (!Array.isArray(instrumentIds) || instrumentIds.length === 0) return [];
  const result = await query(
    `SELECT instrument_id,
            to_char(trade_date, 'YYYY-MM-DD') AS date,
            (close_price * 100)::bigint::text AS close_paise
     FROM price_history
     WHERE instrument_id = ANY($1::bigint[]) AND trade_date >= $2::date
     ORDER BY trade_date ASC`,
    [instrumentIds.map(String), fromDate]
  );
  return result.rows.map((row) => ({
    instrumentId: String(row.instrument_id),
    date: row.date,
    closePaise: row.close_paise,
  }));
}

/**
 * Repository factory allowing complete dependency injection of the query function.
 *
 * @param {Function} [query=defaultQuery]
 */
export function createInstrumentRepository(query = defaultQuery) {
  return {
    listInstruments: (options) => listInstruments(options, query),
    findBySymbol: (symbol) => findBySymbol(symbol, query),
    getHistory: (symbol, range) => getHistory(symbol, range, query),
    listTradeDates: (limit) => listTradeDates(limit, query),
    getClosesForInstruments: (ids, fromDate) => getClosesForInstruments(ids, fromDate, query),
  };
}

export default {
  escapeLike,
  RANGE_DAYS,
  listInstruments,
  findBySymbol,
  getHistory,
  listTradeDates,
  getClosesForInstruments,
  createInstrumentRepository,
};
