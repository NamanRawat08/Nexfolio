import { query as defaultQuery } from '../db/pool.js';

/**
 * Lists a user's watched instruments, newest first, with the latest and previous close
 * (decimal strings, as price_history stores them).
 *
 * @param {string|number} userId
 * @param {Function} [query=defaultQuery]
 * @returns {Promise<Array<{ symbol: string, name: string, sector: string, latestClose: string|null, previousClose: string|null, latestTradeDate: string|null }>>}
 */
export async function listByUser(userId, query = defaultQuery) {
  const result = await query(
    `SELECT i.symbol, i.name, i.sector,
            lh.latest_close, lh.previous_close, lh.latest_trade_date
     FROM watchlist_items w
     JOIN instruments i ON i.id = w.instrument_id
     LEFT JOIN LATERAL (
       SELECT p1.close_price::text AS latest_close,
              to_char(p1.trade_date, 'YYYY-MM-DD') AS latest_trade_date,
              (SELECT p2.close_price::text
               FROM price_history p2
               WHERE p2.instrument_id = i.id AND p2.trade_date < p1.trade_date
               ORDER BY p2.trade_date DESC
               LIMIT 1) AS previous_close
       FROM price_history p1
       WHERE p1.instrument_id = i.id
       ORDER BY p1.trade_date DESC
       LIMIT 1
     ) lh ON true
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC, i.symbol ASC`,
    [userId]
  );
  return result.rows.map((row) => ({
    symbol: row.symbol,
    name: row.name,
    sector: row.sector,
    latestClose: row.latest_close ?? null,
    previousClose: row.previous_close ?? null,
    latestTradeDate: row.latest_trade_date ?? null,
  }));
}

/**
 * Number of items a user is watching, and whether a given instrument is one of them.
 *
 * @returns {Promise<{ count: number, hasInstrument: boolean }>}
 */
export async function getStatus(userId, instrumentId, query = defaultQuery) {
  const result = await query(
    `SELECT count(*)::int AS count, COALESCE(bool_or(instrument_id = $2), false) AS has_instrument
     FROM watchlist_items
     WHERE user_id = $1`,
    [userId, instrumentId]
  );
  const row = result.rows[0];
  return { count: Number(row.count), hasInstrument: row.has_instrument === true };
}

/**
 * Adds an instrument to a user's watchlist; does nothing if it is already there.
 *
 * @returns {Promise<boolean>} true when a new row was added
 */
export async function add(userId, instrumentId, query = defaultQuery) {
  const result = await query(
    `INSERT INTO watchlist_items (user_id, instrument_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, instrument_id) DO NOTHING`,
    [userId, instrumentId]
  );
  return result.rowCount > 0;
}

/**
 * Removes an instrument (by symbol, case-insensitive) from a user's watchlist.
 *
 * @returns {Promise<boolean>} true when a row was removed
 */
export async function removeBySymbol(userId, symbol, query = defaultQuery) {
  const result = await query(
    `DELETE FROM watchlist_items w
     USING instruments i
     WHERE w.user_id = $1 AND w.instrument_id = i.id AND upper(i.symbol) = upper($2)`,
    [userId, symbol]
  );
  return result.rowCount > 0;
}

export function createWatchlistRepository(query = defaultQuery) {
  return {
    listByUser: (userId) => listByUser(userId, query),
    getStatus: (userId, instrumentId) => getStatus(userId, instrumentId, query),
    add: (userId, instrumentId) => add(userId, instrumentId, query),
    removeBySymbol: (userId, symbol) => removeBySymbol(userId, symbol, query),
  };
}

export default { listByUser, getStatus, add, removeBySymbol, createWatchlistRepository };
