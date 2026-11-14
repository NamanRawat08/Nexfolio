import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimitMiddleware, keyByBodyField, keyByIp, keyByUser } from './rateLimit.middleware.js';

const makeRes = () => ({
  statusCode: 200,
  headers: {},
  body: undefined,
  set(k, v) { this.headers[k] = v; return this; },
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; },
});
const result = (over = {}) => ({ allowed: true, limit: 10, remaining: 7, retryAfterMs: 0, ...over });

async function run(limiter, keyFn, req = {}) {
  const res = makeRes();
  let nextCalled = false;
  await createRateLimitMiddleware({ limiter, keyFn, log: () => {} })(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

describe('createRateLimitMiddleware', () => {
  it('requires a limiter and a keyFn', () => {
    assert.throws(() => createRateLimitMiddleware({ keyFn() {} }), /limiter is required/);
    assert.throws(() => createRateLimitMiddleware({ limiter: {} }), /keyFn is required/);
  });

  it('lets allowed requests through and sets quota headers', async () => {
    const { res, nextCalled } = await run({ consume: async () => result() }, () => 'k');
    assert.equal(nextCalled, true);
    assert.equal(res.headers['RateLimit-Limit'], '10');
    assert.equal(res.headers['RateLimit-Remaining'], '7');
    assert.equal(res.headers['Retry-After'], undefined);
  });

  it('answers 429 with the standard error shape and a Retry-After of at least 1 second', async () => {
    for (const [ms, expected] of [[2500, '3'], [100, '1'], [0, '1']]) {
      const { res, nextCalled } = await run({ consume: async () => result({ allowed: false, remaining: -2, retryAfterMs: ms }) }, () => 'k');
      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 429);
      assert.deepEqual(res.body, { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } });
      assert.equal(res.headers['Retry-After'], expected);
      assert.equal(res.headers['RateLimit-Remaining'], '0'); // never negative
    }
  });

  it('passes the key to the limiter and skips limiting when the key is null or undefined', async () => {
    const keys = [];
    const limiter = { consume: async (k) => { keys.push(k); return result(); } };
    await run(limiter, () => 'abc');
    for (const key of [null, undefined]) {
      const { nextCalled } = await run(limiter, () => key);
      assert.equal(nextCalled, true);
    }
    assert.deepEqual(keys, ['abc']);
  });

  it('fails open (calls next, no 429) if the limiter or keyFn throws', async () => {
    const boom = await run({ consume: async () => { throw new Error('boom'); } }, () => 'k');
    assert.equal(boom.nextCalled, true);
    assert.equal(boom.res.statusCode, 200);
    const keyBoom = await run({ consume: async () => result() }, () => { throw new Error('bad key'); });
    assert.equal(keyBoom.nextCalled, true);
  });
});

describe('key functions', () => {
  it('keyByIp normalizes the request IP', () => {
    assert.equal(keyByIp({ ip: '::ffff:10.0.0.1' }), '10.0.0.1');
    assert.equal(keyByIp({}), 'unknown');
  });

  it('keyByUser uses the session user and skips unauthenticated requests', () => {
    assert.equal(keyByUser({ user: { id: '7' } }), 'u7');
    assert.equal(keyByUser({ user: { id: 0 } }), 'u0');
    assert.equal(keyByUser({}), null);
  });

  it('keyByBodyField hashes the trimmed, lower-cased value so no email reaches the key', () => {
    const key = keyByBodyField('identifier');
    const a = key({ body: { identifier: 'Alice@Example.com' } });
    assert.equal(a, key({ body: { identifier: '  alice@example.com ' } }));
    assert.match(a, /^[0-9a-f]{64}$/);
    assert.ok(!a.includes('alice'));
    assert.notEqual(a, key({ body: { identifier: 'bob' } }));
  });

  it('keyByBodyField returns null for missing, non-text, blank or oversized values', () => {
    const key = keyByBodyField('identifier');
    for (const req of [{}, { body: {} }, { body: { identifier: 5 } }, { body: { identifier: ['a'] } }, { body: { identifier: '  ' } }, { body: { identifier: 'x'.repeat(255) } }]) {
      assert.equal(key(req), null);
    }
  });
});
