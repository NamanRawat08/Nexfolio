import { readFileSync } from 'node:fs';
import Redis from 'ioredis';

const lua = (name) => readFileSync(new URL(`./lua/${name}.lua`, import.meta.url), 'utf8');

let client = null;

/**
 * Creates a Redis connection with the limiter scripts registered. `defineCommand` turns each
 * script into a method; ioredis sends the script once and then calls it by hash (EVALSHA).
 *
 * @param {string} url - redis:// or rediss:// URL
 * @param {object} [options]
 * @param {(message: string) => void} [options.onError] - receives connection errors
 * @returns {import('ioredis').Redis}
 */
export function createRedisClient(url, { onError = (m) => console.error(m) } = {}) {
  const redis = new Redis(url, {
    // Fail fast instead of hanging a request while Redis is down or slow; the fallback limiter
    // takes over (see fallbackLimiter.js).
    maxRetriesPerRequest: 1,
    commandTimeout: 500,
    enableOfflineQueue: false,
  });
  redis.defineCommand('slidingWindow', { numberOfKeys: 1, lua: lua('slidingWindow') });
  redis.defineCommand('tokenBucket', { numberOfKeys: 1, lua: lua('tokenBucket') });

  // Throttle: a down Redis would otherwise log on every reconnect attempt.
  let lastLogged = 0;
  redis.on('error', (err) => {
    const now = Date.now();
    if (now - lastLogged > 30_000) {
      lastLogged = now;
      onError(`[Redis] ${err.message}`);
    }
  });
  return redis;
}

/**
 * Lazily creates the shared Redis connection (same pattern as db/pool.js).
 *
 * @param {string} url
 * @returns {import('ioredis').Redis}
 */
export function getRedis(url) {
  if (!client) client = createRedisClient(url);
  return client;
}

/**
 * Closes the shared connection if one was created. Safe to call repeatedly.
 *
 * @returns {Promise<void>}
 */
export async function closeRedis() {
  if (client) {
    const active = client;
    client = null;
    try {
      await active.quit();
    } catch {
      active.disconnect();
    }
  }
}
