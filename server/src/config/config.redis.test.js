import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from './loadConfig.js';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('loadConfig: rate limiting settings', () => {
  it('defaults: no Redis, default prefix, no proxy', () => {
    const c = loadConfig(base);
    assert.equal(c.redisUrl, undefined);
    assert.equal(c.rateLimitPrefix, 'nexfolio:rl');
    assert.equal(c.trustProxy, false);
  });

  it('accepts redis:// and rediss:// URLs, and treats an empty value as unset', () => {
    assert.equal(loadConfig({ ...base, REDIS_URL: 'redis://localhost:6379' }).redisUrl, 'redis://localhost:6379');
    assert.equal(loadConfig({ ...base, REDIS_URL: 'rediss://:pw@host:6380/1' }).redisUrl, 'rediss://:pw@host:6380/1');
    assert.equal(loadConfig({ ...base, REDIS_URL: '' }).redisUrl, undefined);
  });

  it('rejects a REDIS_URL with another scheme, without echoing the value', () => {
    for (const REDIS_URL of ['http://localhost:6379', 'localhost:6379', 'postgres://x']) {
      assert.throws(() => loadConfig({ ...base, REDIS_URL }), (e) => /REDIS_URL must start with redis:\/\/ or rediss:\/\//.test(e.message) && !e.message.includes(REDIS_URL));
    }
  });

  it('validates the key prefix', () => {
    assert.equal(loadConfig({ ...base, RATE_LIMIT_PREFIX: 'prod:nexfolio_1-a' }).rateLimitPrefix, 'prod:nexfolio_1-a');
    for (const RATE_LIMIT_PREFIX of ['has space', 'a*b', 'x'.repeat(41), 'new\nline']) {
      assert.throws(() => loadConfig({ ...base, RATE_LIMIT_PREFIX }), /RATE_LIMIT_PREFIX/);
    }
  });

  it('accepts only a proxy hop count, never "true" (which would trust forged headers)', () => {
    assert.equal(loadConfig({ ...base, TRUST_PROXY: '1' }).trustProxy, 1);
    assert.equal(loadConfig({ ...base, TRUST_PROXY: '10' }).trustProxy, 10);
    assert.equal(loadConfig({ ...base, TRUST_PROXY: '0' }).trustProxy, false);
    for (const TRUST_PROXY of ['true', 'false', '-1', '1.5', '11', 'loopback', '1 ']) {
      assert.throws(() => loadConfig({ ...base, TRUST_PROXY }), /TRUST_PROXY must be a whole number/);
    }
  });
});
