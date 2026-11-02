import pg from 'pg';
import { getConfig } from '../config/index.js';

const { Pool } = pg;

let pool = null;

/**
 * Lazily creates and returns the singleton pg.Pool instance.
 *
 * @returns {import('pg').Pool}
 */
export function getPool() {
  if (!pool) {
    const config = getConfig();
    pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      // Never log connection strings or credentials; log only generic message and stack server-side
      console.error('[DB] Unexpected idle client error:', err && err.stack ? err.stack : err);
    });
  }

  return pool;
}

/**
 * Executes a parameterized query using the pooled connection.
 *
 * @param {string} text - SQL query string with parameter placeholders ($1, $2, etc.)
 * @param {any[]} [params] - Optional array of parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params) {
  return getPool().query(text, params);
}

/**
 * Gracefully terminates the connection pool if created, resetting pool reference to null.
 * Safe to call multiple times and safe when no pool was initialized.
 *
 * @returns {Promise<void>}
 */
export async function closePool() {
  if (pool) {
    const activePool = pool;
    pool = null;
    await activePool.end();
  }
}

export default {
  getPool,
  query,
  closePool,
};
