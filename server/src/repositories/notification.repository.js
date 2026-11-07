import { query as defaultQuery } from '../db/pool.js';

const MAX_LIMIT = 50;

function mapNotification(row) {
  return {
    id: String(row.id),
    kind: row.kind,
    title: row.title,
    body: row.body,
    orderId: String(row.order_id),
    createdAt: row.created_at,
    readAt: row.read_at ?? null,
  };
}

/**
 * Records a notification. An order can only produce one notification of each kind, so a repeat
 * is ignored.
 *
 * @returns {Promise<boolean>} true when a new notification was stored
 */
export async function create({ userId, orderId, kind, title, body }, query = defaultQuery) {
  const result = await query(
    `INSERT INTO notifications (user_id, order_id, kind, title, body)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (order_id, kind) DO NOTHING`,
    [userId, orderId, kind, title, body]
  );
  return result.rowCount > 0;
}

/**
 * A user's notifications, newest first.
 */
export async function listByUser(userId, { limit = 20 } = {}, query = defaultQuery) {
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Number(limit) || 20));
  const result = await query(
    `SELECT id, order_id, kind, title, body, created_at, read_at
     FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT $2`,
    [userId, safeLimit]
  );
  return result.rows.map(mapNotification);
}

/**
 * How many of a user's notifications are still unread.
 */
export async function countUnread(userId, query = defaultQuery) {
  const result = await query(
    'SELECT count(*)::int AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  return Number(result.rows[0].count);
}

/**
 * Marks all of a user's unread notifications as read.
 *
 * @returns {Promise<number>} how many were updated
 */
export async function markAllRead(userId, query = defaultQuery) {
  const result = await query(
    'UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL',
    [userId]
  );
  return result.rowCount;
}

export function createNotificationRepository(query = defaultQuery) {
  return {
    create: (params) => create(params, query),
    listByUser: (userId, options) => listByUser(userId, options, query),
    countUnread: (userId) => countUnread(userId, query),
    markAllRead: (userId) => markAllRead(userId, query),
  };
}

export default { create, listByUser, countUnread, markAllRead, createNotificationRepository };
