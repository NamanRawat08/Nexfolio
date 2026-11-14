import { createHash } from 'node:crypto';
import { normalizeIp } from '../rateLimit/ip.js';

/** Limits by client network address (IPv6 reduced to its /64). Needs `trust proxy` behind a proxy. */
export const keyByIp = (req) => normalizeIp(req.ip);

/** Limits by the signed-in user. Use only after the auth middleware. */
export const keyByUser = (req) => (req.user?.id === undefined ? null : `u${req.user.id}`);

/**
 * Limits by the account name in the request body (`field`), case-insensitively. The name is
 * hashed so email addresses never appear in Redis keys. Returns null (no limit applied here) when
 * the field is missing or not text; such requests fail validation later and still count against
 * the IP limiter.
 *
 * @param {string} field
 */
export function keyByBodyField(field) {
  return (req) => {
    const value = req.body?.[field];
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (normalized === '' || normalized.length > 254) return null;
    return createHash('sha256').update(normalized).digest('hex');
  };
}

/**
 * Express middleware that applies a limiter. It adds `RateLimit-Limit` and `RateLimit-Remaining`
 * headers, and answers 429 with `Retry-After` when the limit is exceeded. A `keyFn` that returns
 * null skips this limiter. If the limiter itself throws (the Redis limiters are wrapped by a
 * fallback and should not), the request is let through and the error is logged, so a limiter bug
 * cannot take the API down.
 *
 * @param {object} options
 * @param {{ consume: (key: string) => Promise<{ allowed: boolean, limit: number, remaining: number, retryAfterMs: number }> }} options.limiter
 * @param {(req: import('express').Request) => string | null} options.keyFn
 * @param {(message: string, error: unknown) => void} [options.log]
 * @returns {import('express').RequestHandler}
 */
export function createRateLimitMiddleware({ limiter, keyFn, log = (m, e) => console.error(m, e) }) {
  if (!limiter) throw new Error('limiter is required for createRateLimitMiddleware');
  if (typeof keyFn !== 'function') throw new Error('keyFn is required for createRateLimitMiddleware');

  return async function rateLimitMiddleware(req, res, next) {
    let result;
    try {
      const key = keyFn(req);
      if (key === null || key === undefined) return next();
      result = await limiter.consume(key);
    } catch (err) {
      log('[RateLimit] limiter error, letting the request through:', err && err.message);
      return next();
    }

    res.set('RateLimit-Limit', String(result.limit));
    res.set('RateLimit-Remaining', String(Math.max(0, result.remaining)));

    if (result.allowed) return next();

    res.set('Retry-After', String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))));
    return res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      },
    });
  };
}
