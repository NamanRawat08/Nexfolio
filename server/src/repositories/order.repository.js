import { query as defaultQuery } from '../db/pool.js';

const MAX_LIMIT = 100;

function mapOrder(row) {
  return {
    id: String(row.id),
    symbol: row.symbol,
    name: row.name,
    side: row.side,
    quantity: String(row.quantity),
    pricePaise: String(row.price_paise),
    totalPaise: String(row.total_paise),
    realizedPnlPaise: row.realized_pnl_paise === null ? null : String(row.realized_pnl_paise),
    createdAt: row.created_at,
  };
}

/**
 * Records a filled order and returns it with instrument symbol and name.
 */
export async function create(
  { userId, instrumentId, side, quantity, pricePaise, totalPaise, realizedPnlPaise = null },
  query = defaultQuery
) {
  const result = await query(
    `WITH o AS (
       INSERT INTO orders (user_id, instrument_id, side, quantity, price_paise, total_paise, realized_pnl_paise)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, instrument_id, side, quantity, price_paise, total_paise, realized_pnl_paise, created_at
     )
     SELECT o.id, i.symbol, i.name, o.side, o.quantity, o.price_paise, o.total_paise,
            o.realized_pnl_paise, o.created_at
     FROM o JOIN instruments i ON i.id = o.instrument_id`,
    [
      userId,
      instrumentId,
      side,
      String(quantity),
      String(pricePaise),
      String(totalPaise),
      realizedPnlPaise === null ? null : String(realizedPnlPaise),
    ]
  );
  return mapOrder(result.rows[0]);
}

/**
 * Lists a user's orders, newest first.
 */
export async function listByUser(userId, { limit = 50, offset = 0 } = {}, query = defaultQuery) {
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Number(limit) || 50));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const result = await query(
    `SELECT o.id, i.symbol, i.name, o.side, o.quantity, o.price_paise, o.total_paise,
            o.realized_pnl_paise, o.created_at
     FROM orders o
     JOIN instruments i ON i.id = o.instrument_id
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset]
  );
  return result.rows.map(mapOrder);
}

/**
 * All of a user's orders, oldest first, in the minimal shape needed to replay
 * cash and holdings over time. Dates are UTC calendar dates.
 *
 * @returns {Promise<Array<{ instrumentId: string, side: string, quantity: string, totalPaise: string, date: string }>>}
 */
export async function listForReplay(userId, query = defaultQuery) {
  const result = await query(
    `SELECT instrument_id, side, quantity::text AS quantity, total_paise::text AS total_paise,
            to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date
     FROM orders
     WHERE user_id = $1
     ORDER BY created_at ASC, id ASC`,
    [userId]
  );
  return result.rows.map((row) => ({
    instrumentId: String(row.instrument_id),
    side: row.side,
    quantity: row.quantity,
    totalPaise: row.total_paise,
    date: row.date,
  }));
}

export function createOrderRepository(query = defaultQuery) {
  return {
    create: (params) => create(params, query),
    listByUser: (userId, options) => listByUser(userId, options, query),
    listForReplay: (userId) => listForReplay(userId, query),
  };
}

export default { create, listByUser, listForReplay, createOrderRepository };
