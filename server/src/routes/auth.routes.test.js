import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthRateLimiter, createAuthRouter } from './auth.routes.js';

describe('auth.routes and rate limiting', () => {
  function createMockHttp(ip = '192.168.1.100') {
    const req = {
      ip,
      headers: {},
      app: {
        get: () => false,
      },
    };
    const res = {
      statusCode: null,
      body: null,
      headers: {},
      setHeader(name, val) {
        this.headers[name] = val;
        return this;
      },
      getHeader(name) {
        return this.headers[name];
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    return { req, res };
  }

  it('rate limiter allows requests up to limit and rejects (limit+1)th with 429 RATE_LIMITED', async () => {
    const limiter = createAuthRateLimiter({
      limit: 2,
      windowMs: 60000,
    });

    let nextCalls = 0;
    const next = () => {
      nextCalls++;
    };

    // 1st request
    const mock1 = createMockHttp('10.0.0.1');
    await limiter(mock1.req, mock1.res, next);
    assert.equal(nextCalls, 1);
    assert.equal(mock1.res.statusCode, null);

    // 2nd request
    const mock2 = createMockHttp('10.0.0.1');
    await limiter(mock2.req, mock2.res, next);
    assert.equal(nextCalls, 2);
    assert.equal(mock2.res.statusCode, null);

    // 3rd request (exceeds limit: 2)
    const mock3 = createMockHttp('10.0.0.1');
    await limiter(mock3.req, mock3.res, next);
    assert.equal(nextCalls, 2, 'next() must NOT be called when rate limited');
    assert.equal(mock3.res.statusCode, 429);
    assert.deepEqual(mock3.res.body, {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      },
    });
  });

  it('createAuthRouter creates router and requires controller and authMiddleware', () => {
    assert.throws(
      () => createAuthRouter({}),
      /controller is required/
    );

    assert.throws(
      () => createAuthRouter({ controller: {} }),
      /authMiddleware is required/
    );

    const fakeController = {
      register: () => {},
      login: () => {},
      logout: () => {},
      me: () => {},
    };
    const fakeAuthMiddleware = () => {};

    const router = createAuthRouter({
      controller: fakeController,
      authMiddleware: fakeAuthMiddleware,
    });

    assert.equal(typeof router, 'function');
  });
});
