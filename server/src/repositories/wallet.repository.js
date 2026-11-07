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
 * Repository factory allowing complete dependency injection of the query function.
 *
 * @param {Function} [query=defaultQuery]
 */
export function createWalletRepository(query = defaultQuery) {
  return {
    findByUserId: (userId) => findByUserId(userId, query),
  };
}

export default { findByUserId, createWalletRepository };
