/**
 * Turns a Redis client error into something an operator can read in a log line.
 *
 * @param {Error} err
 * @returns {string}
 */
export function describeRedisError(err) {
  const message = String(err?.message ?? err);
  if (/enableOfflineQueue|Stream isn't writeable|Connection is closed/i.test(message)) {
    return 'Redis is not connected';
  }
  if (/timed out/i.test(message)) return 'Redis timed out';
  return message;
}

/**
 * Wraps a log function so the same message is written at most once per `windowMs`. Several
 * limiters share one Redis, and without this a Redis outage would log once per limiter.
 *
 * @param {(message: string) => void} log
 * @param {number} [windowMs=30000]
 * @param {() => number} [now]
 * @returns {(message: string) => void}
 */
export function createDedupedLogger(log = (m) => console.error(m), windowMs = 30_000, now = Date.now) {
  const lastSeen = new Map();
  return (message) => {
    const t = now();
    const previous = lastSeen.get(message);
    if (previous !== undefined && t - previous < windowMs) return;
    lastSeen.set(message, t);
    log(message);
  };
}

/**
 * Wraps a primary limiter (Redis) with a fallback (in-memory). If the primary throws, for
 * example because Redis is down, the request is counted by the fallback instead, so protection
 * degrades (per process, not shared) but never disappears and the API does not go down.
 *
 * A simple circuit breaker keeps a dead Redis from slowing every request: after a failure the
 * primary is skipped for `cooldownMs`, then tried again.
 *
 * @param {object} options
 * @param {{ consume: (key: string) => Promise<object> }} options.primary
 * @param {{ consume: (key: string) => Promise<object> }} options.fallback
 * @param {number} [options.cooldownMs=5000]
 * @param {() => number} [options.now]
 * @param {(message: string) => void} [options.log]
 */
export function createFallbackLimiter({
  primary,
  fallback,
  cooldownMs = 5000,
  now = Date.now,
  log = (message) => console.error(message),
}) {
  let skipPrimaryUntil = 0;
  let degraded = false;

  return {
    async consume(key) {
      if (now() >= skipPrimaryUntil) {
        try {
          const result = await primary.consume(key);
          if (degraded) {
            degraded = false;
            log('[RateLimit] Redis is back; using it again');
          }
          return result;
        } catch (err) {
          skipPrimaryUntil = now() + cooldownMs;
          if (!degraded) {
            degraded = true;
            log(`[RateLimit] Redis limiter unavailable (${describeRedisError(err)}); using the in-memory fallback`);
          }
        }
      }
      return fallback.consume(key);
    },
  };
}
