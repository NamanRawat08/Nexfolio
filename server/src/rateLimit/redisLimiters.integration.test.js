// Integration tests for the Redis limiters. They need a real Redis (REDIS_URL, default
// redis://localhost:6379) and skip themselves when it is not reachable, so the normal test run
// works without Redis. Redis uses its own clock, so time cannot be faked here: the tests use
// small numbers and short waits.

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRedisClient } from './redisClient.js';
import { RedisSlidingWindow, RedisTokenBucket } from './redisLimiters.js';
import { createFallbackLimiter } from './fallbackLimiter.js';
import { InMemorySlidingWindow } from './inMemoryLimiters.js';

const url = process.env.REDIS_URL || 'redis://localhost:6379';
const prefix = `test:${process.pid}:${Date.now()}`; // keeps test keys apart from real ones
const quiet = { onError: () => {} };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function connect() {
  const redis = createRedisClient(url, quiet);
  const ready = new Promise((resolve) => {
    redis.once('ready', () => resolve(true));
    setTimeout(() => resolve(false), 1500);
  });
  return { redis, ready };
}

async function countAllowed(limiter, key, n) {
  const results = await Promise.all(Array.from({ length: n }, () => limiter.consume(key)));
  return results.filter((r) => r.allowed).length;
}

describe('Redis limiters (real Redis)', () => {
  const connections = [];
  let up = false;

  before(async () => {
    // Several connections stand in for several app servers sharing one Redis.
    const made = Array.from({ length: 5 }, connect);
    connections.push(...made.map((m) => m.redis));
    up = (await Promise.all(made.map((m) => m.ready))).every(Boolean);
    if (!up) console.warn(`Redis not reachable at ${url.replace(/\/\/.*@/, '//')}; skipping Redis integration tests`);
  });

  after(async () => {
    if (up) {
      const keys = await connections[0].keys(`${prefix}:*`);
      if (keys.length) await connections[0].del(...keys);
    }
    connections.forEach((r) => r.disconnect());
  });

  it('sliding window: exactly `limit` of 100 simultaneous requests across 5 connections are allowed', async (t) => {
    if (!up) return t.skip('Redis not available');
    const limiters = connections.map((redis) => new RedisSlidingWindow({ redis, limit: 10, windowMs: 5000, prefix: `${prefix}:race` }));
    const results = await Promise.all(Array.from({ length: 100 }, (_, i) => limiters[i % 5].consume('one-client')));
    assert.equal(results.filter((r) => r.allowed).length, 10);
    assert.ok(results.filter((r) => !r.allowed).every((r) => r.retryAfterMs > 0 && r.retryAfterMs <= 5000));
  });

  it('sliding window: a different key is not affected, and the key expires on its own', async (t) => {
    if (!up) return t.skip('Redis not available');
    const limiter = new RedisSlidingWindow({ redis: connections[0], limit: 1, windowMs: 400, prefix: `${prefix}:ttl` });
    assert.equal((await limiter.consume('a')).allowed, true);
    assert.equal((await limiter.consume('a')).allowed, false);
    assert.equal((await limiter.consume('b')).allowed, true);
    const ttl = await connections[0].pttl(`${prefix}:ttl:sw:a`);
    assert.ok(ttl > 0 && ttl <= 400, `expected a TTL up to 400 ms, got ${ttl}`);
    await sleep(450);
    assert.equal((await limiter.consume('a')).allowed, true, 'allowed again once the window has passed');
    assert.equal(await connections[0].exists(`${prefix}:ttl:sw:b`), 0, 'idle keys are removed by Redis');
  });

  it('is shared between limiter instances (what makes it distributed)', async (t) => {
    if (!up) return t.skip('Redis not available');
    const mk = (i) => new RedisSlidingWindow({ redis: connections[i], limit: 6, windowMs: 5000, prefix: `${prefix}:shared` });
    const [a, b, c] = [mk(0), mk(1), mk(2)];
    let allowed = 0;
    for (let i = 0; i < 12; i += 1) if ((await [a, b, c][i % 3].consume('client')).allowed) allowed += 1;
    assert.equal(allowed, 6);
  });

  it('token bucket: allows a burst of `capacity`, rejects the rest, then refills', async (t) => {
    if (!up) return t.skip('Redis not available');
    const mk = (i) => new RedisTokenBucket({ redis: connections[i], capacity: 5, refillPerSec: 10, prefix: `${prefix}:tb` });
    const limiters = [0, 1, 2, 3, 4].map(mk);
    const burst = await Promise.all(Array.from({ length: 20 }, (_, i) => limiters[i % 5].consume('u1')));
    assert.equal(burst.filter((r) => r.allowed).length, 5);
    await sleep(250); // 10 tokens per second, so about 2 tokens back
    const after = await countAllowed(limiters[0], 'u1', 5);
    assert.ok(after >= 2 && after <= 3, `expected 2 to 3 allowed after refill, got ${after}`);
  });

  it('with a fallback: an unreachable Redis does not break limiting and does not slow requests down', async (t) => {
    const dead = createRedisClient('redis://127.0.0.1:1', quiet); // nothing listens on port 1
    try {
      const limiter = createFallbackLimiter({
        primary: new RedisSlidingWindow({ redis: dead, limit: 3, windowMs: 60_000, prefix: `${prefix}:dead` }),
        fallback: new InMemorySlidingWindow({ limit: 3, windowMs: 60_000 }),
        cooldownMs: 60_000,
        log: () => {},
      });
      const started = Date.now();
      const results = [];
      for (let i = 0; i < 6; i += 1) results.push(await limiter.consume('client'));
      assert.deepEqual(results.map((r) => r.allowed), [true, true, true, false, false, false]);
      assert.ok(Date.now() - started < 1500, 'only the first request pays the failure; the circuit then skips Redis');
    } finally {
      dead.disconnect();
    }
    void t;
  });
});
