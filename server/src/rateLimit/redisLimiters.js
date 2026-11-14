import { randomUUID } from 'node:crypto';

/**
 * Redis-backed limiters. All the logic lives in the Lua scripts (src/rateLimit/lua): Redis runs
 * a script start to finish without running other commands in between, so read, check and write
 * are atomic even with many app servers sharing one Redis. The scripts use Redis's own clock
 * (`TIME`), so servers with skewed clocks still agree. Same `consume(key)` shape as the
 * in-memory limiters.
 */

export class RedisSlidingWindow {
  constructor({ redis, limit, windowMs, prefix }) {
    this.redis = redis;
    this.limit = limit;
    this.windowMs = windowMs;
    this.prefix = prefix;
  }

  async consume(key) {
    const [allowed, remaining, retryAfterMs] = await this.redis.slidingWindow(
      `${this.prefix}:sw:${key}`,
      this.limit,
      this.windowMs,
      randomUUID() // unique member, so two requests in the same millisecond are both counted
    );
    return { allowed: allowed === 1, limit: this.limit, remaining, retryAfterMs };
  }
}

export class RedisTokenBucket {
  constructor({ redis, capacity, refillPerSec, prefix }) {
    this.redis = redis;
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.prefix = prefix;
  }

  async consume(key) {
    const [allowed, remaining, retryAfterMs] = await this.redis.tokenBucket(
      `${this.prefix}:tb:${key}`,
      this.capacity,
      this.refillPerSec
    );
    return { allowed: allowed === 1, limit: this.capacity, remaining, retryAfterMs };
  }
}
