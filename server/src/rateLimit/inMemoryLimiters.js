/**
 * In-memory limiters. Used when Redis is not configured, and as the fallback when Redis is
 * unreachable. Counters live in this process only: they reset on restart and are not shared
 * between instances (that is what the Redis limiters are for).
 *
 * Every limiter has the same shape: `consume(key)` resolves to
 * `{ allowed, limit, remaining, retryAfterMs }`.
 */

const PRUNE_EVERY = 1000;

/**
 * Sliding window log: at most `limit` requests in ANY window of `windowMs`, measured back from
 * now. No fixed-window edge, where a client sends `limit` requests at 0:59 and `limit` more at
 * 1:00. Memory grows with `limit` per key.
 */
export class InMemorySlidingWindow {
  constructor({ limit, windowMs, now = Date.now }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.logs = new Map(); // key -> timestamps of allowed requests, oldest first
    this.calls = 0;
  }

  async consume(key) {
    const now = this.now();
    const log = this.logs.get(key) ?? [];
    this.#trim(log, now);

    let allowed = false;
    if (log.length < this.limit) {
      log.push(now);
      allowed = true;
    }
    this.logs.set(key, log);

    if (++this.calls % PRUNE_EVERY === 0) this.prune();

    return {
      allowed,
      limit: this.limit,
      remaining: this.limit - log.length,
      retryAfterMs: allowed ? 0 : log[0] + this.windowMs - now,
    };
  }

  /** Forgets keys with no requests left in their window, so idle clients use no memory. */
  prune() {
    const now = this.now();
    for (const [key, log] of this.logs) {
      this.#trim(log, now);
      if (log.length === 0) this.logs.delete(key);
    }
  }

  #trim(log, now) {
    const windowStart = now - this.windowMs;
    while (log.length > 0 && log[0] <= windowStart) log.shift();
  }
}

/**
 * Token bucket: holds up to `capacity` tokens, refilled at `refillPerSec`; each request takes
 * one. Allows a burst of `capacity`, then settles at the refill rate. Tokens are refilled lazily
 * from elapsed time, so there is no timer.
 */
export class InMemoryTokenBucket {
  constructor({ capacity, refillPerSec, now = Date.now }) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.now = now;
    this.buckets = new Map(); // key -> { tokens, lastRefill }
    this.calls = 0;
  }

  async consume(key) {
    const now = this.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, lastRefill: now };
    this.#refill(bucket, now);

    let allowed = false;
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      allowed = true;
    }
    this.buckets.set(key, bucket);

    if (++this.calls % PRUNE_EVERY === 0) this.prune();

    return {
      allowed,
      limit: this.capacity,
      remaining: Math.floor(bucket.tokens),
      retryAfterMs: allowed ? 0 : Math.ceil(((1 - bucket.tokens) / this.refillPerSec) * 1000),
    };
  }

  /** Forgets buckets that have refilled completely: they hold no information. */
  prune() {
    const now = this.now();
    for (const [key, bucket] of this.buckets) {
      this.#refill(bucket, now);
      if (bucket.tokens >= this.capacity) this.buckets.delete(key);
    }
  }

  #refill(bucket, now) {
    const elapsedSec = Math.max(0, now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSec * this.refillPerSec);
    bucket.lastRefill = now;
  }
}
