import { query as defaultQuery } from '../db/pool.js';

/**
 * Finds a user's wallet. cash_paise is a BIGINT, which pg returns as a string;
 * it is kept as a string to avoid precision loss.
 *
 * @param {string|number} userId
 * @param {Function} [query=defaultQuery] - Injected query function
 * @returns {Promise<{ userId: string|number, cashPaise: string, createdAt: string, updatedAt: string } | null>}
 */
export async function findByUserId(userId, query = defaultQuery) {
  const sql = `
    SELECT user_id, cash_paise, created_at, updated_at
    FROM wallets
    WHERE user_id = $1
    LIMIT 1
  `;
  const result = await query(sql, [userId]);
  const row = result.rows[0];
  if (!row) return null;

  return {
    userId: row.user_id,
    cashPaise: String(row.cash_paise),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Locks the user's wallet row until the surrounding transaction ends, so concurrent
 * orders from the same user are serialized. Must run inside a transaction.
 *
 * @param {string|number} userId
 * @param {Function} query - Transaction-bound query function
 * @returns {Promise<{ cashPaise: string } | null>}
 */
export async function lockByUserId(userId, query) {
  const result = await query('SELECT cash_paise FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
  const row = result.rows[0];
  return row ? { cashPaise: String(row.cash_paise) } : null;
}

/**
 * Sets the wallet's cash balance.
 *
 * @param {string|number} userId
 * @param {bigint|string} cashPaise - New balance in paise (must be >= 0)
 * @param {Function} query - Transaction-bound query function
 */
export async function setCash(userId, cashPaise, query) {
  await query('UPDATE wallets SET cash_paise = $2, updated_at = now() WHERE user_id = $1', [
    userId,
    String(cashPaise),
  ]);
}

/**
 * Repository factory allowing complete dependency injection of the query function.
 *
 * @param {Function} [query=defaultQuery]
 */
export function createWalletRepository(query = defaultQuery) {
  return {
    findByUserId: (userId) => findByUserId(userId, query),
    lockByUserId: (userId) => lockByUserId(userId, query),
    setCash: (userId, cashPaise) => setCash(userId, cashPaise, query),
  };
}

export default { findByUserId, lockByUserId, setCash, createWalletRepository };
