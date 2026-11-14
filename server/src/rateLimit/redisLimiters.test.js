import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RedisSlidingWindow, RedisTokenBucket } from './redisLimiters.js';

describe('Redis limiters (with a fake client)', () => {
  it('RedisSlidingWindow calls the script with a prefixed key, limit, window and a unique id', async () => {
    const calls = [];
    const redis = { async slidingWindow(...a) { calls.push(a); return [1, 4, 0]; } };
    const l = new RedisSlidingWindow({ redis, limit: 5, windowMs: 1000, prefix: 'p:x' });
    assert.deepEqual(await l.consume('k'), { allowed: true, limit: 5, remaining: 4, retryAfterMs: 0 });
    await l.consume('k');
    assert.equal(calls[0][0], 'p:x:sw:k');
    assert.deepEqual(calls[0].slice(1, 3), [5, 1000]);
    assert.notEqual(calls[0][3], calls[1][3], 'each request gets its own member id');
  });

  it('maps a rejection and passes the retry time through', async () => {
    const redis = { async slidingWindow() { return [0, 0, 1234]; }, async tokenBucket() { return [0, 0, 250]; } };
    assert.deepEqual(await new RedisSlidingWindow({ redis, limit: 1, windowMs: 1, prefix: 'p' }).consume('k'), { allowed: false, limit: 1, remaining: 0, retryAfterMs: 1234 });
    assert.deepEqual(await new RedisTokenBucket({ redis, capacity: 3, refillPerSec: 2, prefix: 'p' }).consume('k'), { allowed: false, limit: 3, remaining: 0, retryAfterMs: 250 });
  });

  it('RedisTokenBucket calls the script with a prefixed key, capacity and refill rate', async () => {
    let args;
    const redis = { async tokenBucket(...a) { args = a; return [1, 2, 0]; } };
    await new RedisTokenBucket({ redis, capacity: 20, refillPerSec: 5, prefix: 'p:o' }).consume('u1');
    assert.deepEqual(args, ['p:o:tb:u1', 20, 5]);
  });

  it('lets connection errors propagate so the fallback limiter can handle them', async () => {
    const redis = { async slidingWindow() { throw new Error('ECONNREFUSED'); } };
    await assert.rejects(new RedisSlidingWindow({ redis, limit: 1, windowMs: 1, prefix: 'p' }).consume('k'), /ECONNREFUSED/);
  });
});
