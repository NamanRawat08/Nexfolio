import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDedupedLogger, createFallbackLimiter, describeRedisError } from './fallbackLimiter.js';

const fake = (label, impl) => {
  const calls = [];
  return { calls, async consume(key) { calls.push(key); return impl ? impl(key) : { allowed: true, limit: 1, remaining: 0, retryAfterMs: 0, from: label }; } };
};

describe('createFallbackLimiter', () => {
  it('uses the primary when it works and never touches the fallback', async () => {
    const primary = fake('primary');
    const fallback = fake('fallback');
    const l = createFallbackLimiter({ primary, fallback, log: () => {} });
    assert.equal((await l.consume('k')).from, 'primary');
    assert.equal(fallback.calls.length, 0);
  });

  it('falls back when the primary throws, and logs once', async () => {
    const logs = [];
    const primary = fake('primary', () => { throw new Error('connection refused'); });
    const fallback = fake('fallback');
    const l = createFallbackLimiter({ primary, fallback, log: (m) => logs.push(m) });
    assert.equal((await l.consume('k')).from, 'fallback');
    assert.equal(logs.length, 1);
    assert.match(logs[0], /connection refused/);
    assert.match(logs[0], /^\[RateLimit\] Redis limiter unavailable/);
  });

  it('skips a failed primary during the cooldown (no slow retry on every request), then retries', async () => {
    let t = 0;
    let failing = true;
    const primary = fake('primary', () => { if (failing) throw new Error('down'); return { allowed: true, limit: 1, remaining: 0, retryAfterMs: 0, from: 'primary' }; });
    const fallback = fake('fallback');
    const logs = [];
    const l = createFallbackLimiter({ primary, fallback, cooldownMs: 5000, now: () => t, log: (m) => logs.push(m) });

    await l.consume('a'); // fails, starts cooldown
    t = 1000; await l.consume('b');
    t = 4999; await l.consume('c');
    assert.equal(primary.calls.length, 1, 'primary is not tried during the cooldown');
    assert.equal(fallback.calls.length, 3);

    t = 5000; failing = false;
    assert.equal((await l.consume('d')).from, 'primary'); // retried, and recovered
    assert.equal(primary.calls.length, 2);
    assert.ok(logs.some((m) => /back/.test(m)), 'logs recovery');
  });

  it('stays quiet while still failing after the cooldown, but keeps protecting via the fallback', async () => {
    let t = 0;
    const logs = [];
    const primary = fake('primary', () => { throw new Error('down'); });
    const fallback = fake('fallback');
    const l = createFallbackLimiter({ primary, fallback, cooldownMs: 100, now: () => t, log: (m) => logs.push(m) });
    for (t = 0; t < 1000; t += 100) assert.equal((await l.consume('k')).from, 'fallback');
    assert.equal(logs.length, 1);
  });
});

describe('describeRedisError', () => {
  it('translates cryptic client errors and passes others through', () => {
    assert.equal(describeRedisError(new Error("Stream isn't writeable and enableOfflineQueue options is false")), 'Redis is not connected');
    assert.equal(describeRedisError(new Error('Connection is closed.')), 'Redis is not connected');
    assert.equal(describeRedisError(new Error('Command timed out')), 'Redis timed out');
    assert.equal(describeRedisError(new Error('WRONGPASS invalid password')), 'WRONGPASS invalid password');
    assert.equal(describeRedisError('plain'), 'plain');
  });
});

describe('createDedupedLogger', () => {
  it('writes the same message once per window, different messages separately, and again after the window', () => {
    let t = 0;
    const out = [];
    const log = createDedupedLogger((m) => out.push(m), 1000, () => t);
    log('a'); log('a'); log('b');
    t = 999; log('a');
    t = 1000; log('a');
    assert.deepEqual(out, ['a', 'b', 'a']);
  });
});
