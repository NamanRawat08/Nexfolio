import { AppError } from '../utils/AppError.js';
import { query as defaultQuery } from '../db/pool.js';

export const getHealth = (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'nexfolio-api',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Controller factory for database health check.
 *
 * @param {object} [options]
 * @param {(text: string, params?: any[]) => Promise<any>} [options.query] - Query function
 * @param {number} [options.timeoutMs=2000] - Timeout in milliseconds
 * @returns {import('express').RequestHandler}
 */
export function createDbHealthController({ query = defaultQuery, timeoutMs = 2000 } = {}) {
  return async (req, res, next) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const timeoutErr = new Error('Database health check timed out');
        timeoutErr.code = 'DB_TIMEOUT';
        reject(timeoutErr);
      }, timeoutMs);
      if (timeoutId && typeof timeoutId.unref === 'function') {
        timeoutId.unref();
      }
    });

    try {
      await Promise.race([query('SELECT 1'), timeoutPromise]);
      clearTimeout(timeoutId);

      return res.status(200).json({
        status: 'ok',
        database: 'up',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      clearTimeout(timeoutId);
      // Log the real error server-side with stack; never leak DATABASE_URL
      console.error('[DB Health] Database health check failed:', err && err.stack ? err.stack : err);
      return next(new AppError(503, 'DB_UNAVAILABLE', 'Database unavailable'));
    }
  };
}

export const getDbHealth = createDbHealthController();
