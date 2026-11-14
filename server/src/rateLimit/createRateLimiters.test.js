import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiters, POLICIES } from './createRateLimiters.js';
import { InMemorySlidingWindow, InMemoryTokenBucket } from './inMemoryLimiters.js';

const config = { rateLimitPrefix: 'test:rl' };

describe('createRateLimiters', () => {
  it('has one policy per limited action, with the documented limits', () => {
    assert.deepEqual(Object.keys(POLICIES), ['register', 'loginIp', 'loginAccount', 'changePassword', 'orders']);
    assert.equal(POLICIES.loginAccount.limit, 10);
    assert.equal(POLICIES.changePassword.limit, 5);
    assert.deepEqual([POLICIES.orders.capacity, POLICIES.orders.refillPerSec], [20, 5]);
    assert.ok(Object.isFrozen(POLICIES));
  });

  it('uses plain in-memory limiters when Redis is not configured', async () => {
    const limiters = createRateLimiters({ config });
    assert.ok(limiters.register instanceof InMemorySlidingWindow);
    assert.ok(limiters.orders instanceof InMemoryTokenBucket);
    for (let i = 0; i < POLICIES.changePassword.limit; i += 1) assert.equal((await limiters.changePassword.consume('u1')).allowed, true);
    assert.equal((await limiters.changePassword.consume('u1')).allowed, false);
    assert.equal((await limiters.changePassword.consume('u2')).allowed, true);
  });

  it('gives every policy its own counters', async () => {
    const limiters = createRateLimiters({ config });
    for (let i = 0; i < POLICIES.register.limit; i += 1) await limiters.register.consume('ip');
    assert.equal((await limiters.register.consume('ip')).allowed, false);
    assert.equal((await limiters.loginIp.consume('ip')).allowed, true);
  });

  it('uses Redis, with a prefix per policy, when a client is provided', async () => {
    const calls = [];
    const redis = {
      async slidingWindow(...args) { calls.push(['sw', ...args.slice(0, 3)]); return [1, 9, 0]; },
      async tokenBucket(...args) { calls.push(['tb', ...args]); return [1, 19, 0]; },
    };
    const limiters = createRateLimiters({ config, redis });
    assert.equal((await limiters.loginAccount.consume('abc')).allowed, true);
    assert.equal((await limiters.orders.consume('u5')).allowed, true);
    assert.deepEqual(calls[0], ['sw', 'test:rl:loginAccount:sw:abc', 10, 15 * 60 * 1000]);
    assert.deepEqual(calls[1], ['tb', 'test:rl:orders:tb:u5', 20, 5]);
  });

  it('keeps limiting in memory when the Redis calls fail', async () => {
    const redis = {
      async slidingWindow() { throw new Error('connection refused'); },
      async tokenBucket() { throw new Error('connection refused'); },
    };
    const limiters = createRateLimiters({ config, redis, log: () => {} });
    for (let i = 0; i < POLICIES.changePassword.limit; i += 1) assert.equal((await limiters.changePassword.consume('u1')).allowed, true);
    assert.equal((await limiters.changePassword.consume('u1')).allowed, false, 'the fallback still enforces the limit');
  });
});
