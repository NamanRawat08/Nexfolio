import { query as defaultQuery } from '../db/pool.js';

const MAX_LIMIT = 100;
export const ORDER_STATUSES = Object.freeze(['PENDING', 'FILLED', 'CANCELLED']);

const ORDER_COLUMNS = `o.id, i.symbol, i.name, o.side, o.order_type, o.status, o.quantity,
       o.limit_price_paise, o.price_paise, o.total_paise, o.realized_pnl_paise,
       o.created_at, to_char(o.executed_on, 'YYYY-MM-DD') AS executed_on`;

const str = (v) => (v === null || v === undefined ? null : String(v));

function mapOrder(row) {
  return {
    id: String(row.id),
    symbol: row.symbol,
    name: row.name,
    side: row.side,
    orderType: row.order_type,
    status: row.status,
    quantity: String(row.quantity),
    limitPricePaise: str(row.limit_price_paise),
    pricePaise: str(row.price_paise),
    totalPaise: str(row.total_paise),
    realizedPnlPaise: str(row.realized_pnl_paise),
    createdAt: row.created_at,
    executedOn: row.executed_on ?? null,
  };
}

/**
 * Records an order (filled, or a pending limit order) and returns it with instrument details.
 */
export async function create(
  {
    userId,
    instrumentId,
    side,
    quantity,
    orderType = 'MARKET',
    status = 'FILLED',
    limitPricePaise = null,
    pricePaise = null,
    totalPaise = null,
    realizedPnlPaise = null,
    placedPriceDate = null,
    executedOn = null,
  },
  query = defaultQuery
) {
  const result = await query(
    `WITH o AS (
       INSERT INTO orders (user_id, instrument_id, side, order_type, status, quantity, limit_price_paise,
                           price_paise, total_paise, realized_pnl_paise, placed_price_date, executed_on)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::date, COALESCE($12::date, CASE WHEN $5 = 'FILLED' THEN (now() AT TIME ZONE 'UTC')::date END))
       RETURNING *
     )
     SELECT ${ORDER_COLUMNS}
     FROM o
     JOIN instruments i ON i.id = o.instrument_id`,
    [
      userId,
      instrumentId,
      side,
      orderType,
      status,
      String(quantity),
      str(limitPricePaise),
      str(pricePaise),
      str(totalPaise),
      str(realizedPnlPaise),
      placedPriceDate,
      executedOn,
    ]
  );
  return mapOrder(result.rows[0]);
}

/**
 * Lists a user's orders, newest first, optionally filtered by status.
 */
export async function listByUser(userId, { limit = 50, offset = 0, status = null } = {}, query = defaultQuery) {
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Number(limit) || 50));
  const safeOffset = Math.max(0, Number(offset) || 0);
  const result = await query(
    `SELECT ${ORDER_COLUMNS}
     FROM orders o
     JOIN instruments i ON i.id = o.instrument_id
     WHERE o.user_id = $1 AND ($4::text IS NULL OR o.status = $4)
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT $2 OFFSET $3`,
    [userId, safeLimit, safeOffset, status]
  );
  return result.rows.map(mapOrder);
}

/**
 * Cash and shares held back by a user's pending limit orders. BUY orders reserve their
 * limit price times quantity; SELL orders reserve their shares.
 *
 * @returns {Promise<{ cashPaise: bigint, sharesByInstrument: Map<string, bigint>, count: number }>}
 */
export async function reservedForUser(userId, query = defaultQuery) {
  const result = await query(
    `SELECT side, instrument_id,
            SUM(quantity)::text AS quantity,
            SUM(limit_price_paise * quantity)::text AS reserved_paise,
            COUNT(*)::int AS count
     FROM orders
     WHERE user_id = $1 AND status = 'PENDING'
     GROUP BY side, instrument_id`,
    [userId]
  );
  let cashPaise = 0n;
  let count = 0;
  const sharesByInstrument = new Map();
  for (const row of result.rows) {
    count += Number(row.count);
    if (row.side === 'BUY') {
      cashPaise += BigInt(row.reserved_paise);
    } else {
      const key = String(row.instrument_id);
      sharesByInstrument.set(key, (sharesByInstrument.get(key) ?? 0n) + BigInt(row.quantity));
    }
  }
  return { cashPaise, sharesByInstrument, count };
}

/**
 * Locks one of the user's orders (any status) for update. Returns null if it does not exist
 * or belongs to someone else.
 */
export async function lockForUser(orderId, userId, query = defaultQuery) {
  const result = await query(
    `SELECT id, status FROM orders WHERE id = $1 AND user_id = $2 FOR UPDATE`,
    [orderId, userId]
  );
  const row = result.rows[0];
  return row ? { id: String(row.id), status: row.status } : null;
}

/**
 * Locks a pending order by id for the matching job; null when it is no longer pending.
 */
export async function lockPending(orderId, query = defaultQuery) {
  const result = await query(
    `SELECT id FROM orders WHERE id = $1 AND status = 'PENDING' FOR UPDATE`,
    [orderId]
  );
  return result.rows.length > 0;
}

/**
 * All pending orders, oldest first, for the matching job.
 */
export async function listPending(query = defaultQuery) {
  const result = await query(
    `SELECT id, user_id, instrument_id, side, quantity::text AS quantity,
            limit_price_paise::text AS limit_price_paise,
            to_char(placed_price_date, 'YYYY-MM-DD') AS placed_price_date
     FROM orders
     WHERE status = 'PENDING'
     ORDER BY created_at ASC, id ASC`
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    instrumentId: String(row.instrument_id),
    side: row.side,
    quantity: row.quantity,
    limitPricePaise: row.limit_price_paise,
    placedPriceDate: row.placed_price_date,
  }));
}

/**
 * Turns a pending order into a filled one.
 */
export async function markFilled(orderId, { pricePaise, totalPaise, realizedPnlPaise, executedOn }, query = defaultQuery) {
  await query(
    `UPDATE orders
     SET status = 'FILLED', price_paise = $2, total_paise = $3, realized_pnl_paise = $4,
         executed_on = $5::date, updated_at = now()
     WHERE id = $1 AND status = 'PENDING'`,
    [orderId, String(pricePaise), String(totalPaise), str(realizedPnlPaise), executedOn]
  );
}

/**
 * Cancels a pending order and returns it, or null when it was not pending.
 */
export async function markCancelled(orderId, query = defaultQuery) {
  const result = await query(
    `WITH o AS (
       UPDATE orders SET status = 'CANCELLED', updated_at = now()
       WHERE id = $1 AND status = 'PENDING'
       RETURNING *
     )
     SELECT ${ORDER_COLUMNS}
     FROM o
     JOIN instruments i ON i.id = o.instrument_id`,
    [orderId]
  );
  return result.rows[0] ? mapOrder(result.rows[0]) : null;
}

/**
 * Filled orders only, oldest first, in the minimal shape needed to replay cash and
 * holdings over time. Dates are the market date each order executed on.
 *
 * @returns {Promise<Array<{ instrumentId: string, side: string, quantity: string, totalPaise: string, date: string }>>}
 */
export async function listForReplay(userId, query = defaultQuery) {
  const result = await query(
    `SELECT instrument_id, side, quantity::text AS quantity, total_paise::text AS total_paise,
            to_char(executed_on, 'YYYY-MM-DD') AS date
     FROM orders
     WHERE user_id = $1 AND status = 'FILLED'
     ORDER BY executed_on ASC, id ASC`,
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
    reservedForUser: (userId) => reservedForUser(userId, query),
    lockForUser: (orderId, userId) => lockForUser(orderId, userId, query),
    lockPending: (orderId) => lockPending(orderId, query),
    listPending: () => listPending(query),
    markFilled: (orderId, fill) => markFilled(orderId, fill, query),
    markCancelled: (orderId) => markCancelled(orderId, query),
    listForReplay: (userId) => listForReplay(userId, query),
  };
}

export default {
  create,
  listByUser,
  reservedForUser,
  lockForUser,
  lockPending,
  listPending,
  markFilled,
  markCancelled,
  listForReplay,
  createOrderRepository,
};
