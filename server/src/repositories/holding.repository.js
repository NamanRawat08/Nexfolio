import { query as defaultQuery } from '../db/pool.js';

/**
 * Locks and returns a user's position in one instrument (null if none).
 * Must run inside a transaction.
 */
export async function findForUpdate(userId, instrumentId, query = defaultQuery) {
  const result = await query(
    `SELECT quantity, total_cost_paise
     FROM holdings
     WHERE user_id = $1 AND instrument_id = $2
     FOR UPDATE`,
    [userId, instrumentId]
  );
  const row = result.rows[0];
  return row ? { quantity: BigInt(row.quantity), totalCostPaise: BigInt(row.total_cost_paise) } : null;
}

/** Inserts or replaces a position. */
export async function upsert(userId, instrumentId, { quantity, totalCostPaise }, query = defaultQuery) {
  await query(
    `INSERT INTO holdings (user_id, instrument_id, quantity, total_cost_paise)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, instrument_id)
     DO UPDATE SET quantity = EXCLUDED.quantity,
                   total_cost_paise = EXCLUDED.total_cost_paise,
                   updated_at = now()`,
    [userId, instrumentId, String(quantity), String(totalCostPaise)]
  );
}

/** Removes a fully sold position. */
export async function remove(userId, instrumentId, query = defaultQuery) {
  await query('DELETE FROM holdings WHERE user_id = $1 AND instrument_id = $2', [userId, instrumentId]);
}

/**
 * Lists a user's positions with the latest close, all amounts in integer paise (strings).
 * Value and P&L are derived from the latest price in price_history.
 */
export async function listByUser(userId, query = defaultQuery) {
  const result = await query(
    `SELECT i.symbol, i.name, i.sector,
            h.quantity::text AS quantity,
            h.total_cost_paise::text AS total_cost_paise,
            (lp.close_price * 100)::bigint::text AS last_price_paise,
            (lp.prev_close_price * 100)::bigint::text AS prev_close_paise
     FROM holdings h
     JOIN instruments i ON i.id = h.instrument_id
     LEFT JOIN LATERAL (
       SELECT p.close_price,
              LEAD(p.close_price) OVER (ORDER BY p.trade_date DESC) AS prev_close_price
       FROM price_history p
       WHERE p.instrument_id = h.instrument_id
       ORDER BY p.trade_date DESC
       LIMIT 1
     ) lp ON true
     WHERE h.user_id = $1
     ORDER BY i.symbol ASC`,
    [userId]
  );
  return result.rows.map((row) => ({
    symbol: row.symbol,
    name: row.name,
    sector: row.sector,
    quantity: row.quantity,
    totalCostPaise: row.total_cost_paise,
    lastPricePaise: row.last_price_paise,
    prevClosePaise: row.prev_close_paise,
  }));
}

export function createHoldingRepository(query = defaultQuery) {
  return {
    findForUpdate: (userId, instrumentId) => findForUpdate(userId, instrumentId, query),
    upsert: (userId, instrumentId, position) => upsert(userId, instrumentId, position, query),
    remove: (userId, instrumentId) => remove(userId, instrumentId, query),
    listByUser: (userId) => listByUser(userId, query),
  };
}

export default { findForUpdate, upsert, remove, listByUser, createHoldingRepository };
