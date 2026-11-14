import { InMemorySlidingWindow, InMemoryTokenBucket } from './inMemoryLimiters.js';
import { RedisSlidingWindow, RedisTokenBucket } from './redisLimiters.js';
import { createDedupedLogger, createFallbackLimiter } from './fallbackLimiter.js';
import { getRedis } from './redisClient.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * The limits, in one place. Sliding windows are strict (never more than `limit` in any window),
 * which suits sign-in. The token bucket allows a short burst and then a steady rate, which suits
 * placing orders.
 */
export const POLICIES = Object.freeze({
  register: { type: 'sliding', limit: 10, windowMs: FIFTEEN_MINUTES }, // per IP
  loginIp: { type: 'sliding', limit: 30, windowMs: FIFTEEN_MINUTES }, // per IP (shared networks)
  loginAccount: { type: 'sliding', limit: 10, windowMs: FIFTEEN_MINUTES }, // per account name
  changePassword: { type: 'sliding', limit: 5, windowMs: FIFTEEN_MINUTES }, // per signed-in user
  orders: { type: 'bucket', capacity: 20, refillPerSec: 5 }, // per signed-in user
});

/**
 * Builds one limiter per policy. With a Redis URL in the config, each limiter counts in Redis
 * (shared by every server instance and kept across restarts) and falls back to a per-process
 * in-memory limiter if Redis fails. Without one, only the in-memory limiters are used.
 *
 * @param {object} options
 * @param {{ redisUrl?: string, rateLimitPrefix: string }} options.config
 * @param {import('ioredis').Redis | null} [options.redis] - override, for tests
 * @param {(message: string) => void} [options.log]
 * @returns {Record<keyof typeof POLICIES, { consume: (key: string) => Promise<object> }>}
 */
export function createRateLimiters({ config, redis, log = createDedupedLogger() }) {
  const client = redis !== undefined ? redis : config.redisUrl ? getRedis(config.redisUrl) : null;

  const limiters = {};
  for (const [name, policy] of Object.entries(POLICIES)) {
    const memory =
      policy.type === 'sliding'
        ? new InMemorySlidingWindow({ limit: policy.limit, windowMs: policy.windowMs })
        : new InMemoryTokenBucket({ capacity: policy.capacity, refillPerSec: policy.refillPerSec });

    if (!client) {
      limiters[name] = memory;
      continue;
    }

    const prefix = `${config.rateLimitPrefix}:${name}`;
    const shared =
      policy.type === 'sliding'
        ? new RedisSlidingWindow({ redis: client, limit: policy.limit, windowMs: policy.windowMs, prefix })
        : new RedisTokenBucket({
            redis: client,
            capacity: policy.capacity,
            refillPerSec: policy.refillPerSec,
            prefix,
          });
    limiters[name] = createFallbackLimiter({ primary: shared, fallback: memory, log });
  }
  return Object.freeze(limiters);
}
