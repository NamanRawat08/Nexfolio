import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAuthRouter } from './auth.routes.js';
import {
  createRateLimitMiddleware,
  keyByBodyField,
  keyByIp,
  keyByUser,
} from '../middleware/rateLimit.middleware.js';
import { InMemorySlidingWindow } from '../rateLimit/inMemoryLimiters.js';

const handler = (name) => (req, res) => res.status(200).json({ ok: name });
const fakeController = {
  register: handler('register'),
  login: handler('login'),
  changePassword: handler('changePassword'),
  logout: handler('logout'),
  me: handler('me'),
};
// Fake session: the user id comes from a header, so tests can act as different users.
const fakeAuth = (req, res, next) => {
  const id = req.get('x-user');
  if (!id) return res.status(401).json({ error: { code: 'UNAUTHENTICATED' } });
  req.user = { id };
  return next();
};
const sliding = (limit) => new InMemorySlidingWindow({ limit, windowMs: 60_000 });
const limit = (limiter, keyFn) => createRateLimitMiddleware({ limiter, keyFn, log: () => {} });

function buildRateLimits({ register = 2, loginIp = 100, loginAccount = 2, changePassword = 2 } = {}) {
  return {
    register: [limit(sliding(register), keyByIp)],
    login: [limit(sliding(loginIp), keyByIp), limit(sliding(loginAccount), keyByBodyField('identifier'))],
    changePassword: [limit(sliding(changePassword), keyByUser)],
  };
}

describe('createAuthRouter', () => {
  const rateLimits = { register: [], login: [], changePassword: [] };

  it('requires controller, authMiddleware and every rate-limit list', () => {
    assert.throws(() => createAuthRouter({}), /controller is required/);
    assert.throws(() => createAuthRouter({ controller: {} }), /authMiddleware is required/);
    for (const name of ['register', 'login', 'changePassword']) {
      const partial = { ...rateLimits };
      delete partial[name];
      assert.throws(
        () => createAuthRouter({ controller: fakeController, authMiddleware: fakeAuth, rateLimits: partial }),
        new RegExp(`rateLimits.${name} is required`)
      );
    }
    assert.throws(() => createAuthRouter({ controller: fakeController, authMiddleware: fakeAuth }), /rateLimits.register is required/);
  });

  it('registers the five routes, with auth then the limiter before change-password', () => {
    const rl = (name) => ({ name });
    const router = createAuthRouter({
      controller: fakeController,
      authMiddleware: fakeAuth,
      rateLimits: { register: [], login: [], changePassword: [rl] },
    });
    const routes = router.stack.filter((l) => l.route).map((l) => [l.route.path, Object.keys(l.route.methods)[0]]);
    assert.deepEqual(routes, [
      ['/register', 'post'],
      ['/login', 'post'],
      ['/change-password', 'post'],
      ['/logout', 'post'],
      ['/me', 'get'],
    ]);
    const cp = router.stack.find((l) => l.route?.path === '/change-password').route;
    assert.deepEqual(cp.stack.map((l) => l.handle), [fakeAuth, rl, fakeController.changePassword]);
  });
});

describe('auth routes with real rate limiting over HTTP', () => {
  let server;
  let base;

  async function startWith(rateLimits) {
    const app = express();
    app.use(express.json());
    app.use('/auth', createAuthRouter({ controller: fakeController, authMiddleware: fakeAuth, rateLimits }));
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${server.address().port}/auth`;
  }
  const stop = () => new Promise((resolve) => server?.close(resolve));
  const post = (path, body, headers = {}) =>
    fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body ?? {}),
    });

  describe('register', () => {
    before(() => startWith(buildRateLimits({ register: 2 })));
    after(stop);

    it('allows up to the limit, then answers 429 RATE_LIMITED with Retry-After and quota headers', async () => {
      const a = await post('/register', {});
      assert.equal(a.status, 200);
      assert.equal(a.headers.get('ratelimit-limit'), '2');
      assert.equal(a.headers.get('ratelimit-remaining'), '1');
      assert.equal((await post('/register', {})).status, 200);

      const blocked = await post('/register', {});
      assert.equal(blocked.status, 429);
      assert.deepEqual(await blocked.json(), {
        error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
      });
      assert.ok(Number(blocked.headers.get('retry-after')) >= 1);
      assert.equal(blocked.headers.get('ratelimit-remaining'), '0');
    });
  });

  describe('login', () => {
    before(() => startWith(buildRateLimits({ loginIp: 100, loginAccount: 2 })));
    after(stop);

    it('limits per account name, case-insensitively, without blocking other accounts', async () => {
      assert.equal((await post('/login', { identifier: 'Alice@Example.com' })).status, 200);
      assert.equal((await post('/login', { identifier: ' alice@example.com ' })).status, 200);
      assert.equal((await post('/login', { identifier: 'ALICE@EXAMPLE.COM' })).status, 429);
      assert.equal((await post('/login', { identifier: 'bob' })).status, 200);
    });

    it('does not apply the account limit to bodies without a usable identifier', async () => {
      for (const body of [{}, { identifier: 42 }, { identifier: '   ' }, { identifier: 'x'.repeat(300) }]) {
        for (let i = 0; i < 4; i += 1) assert.equal((await post('/login', body)).status, 200);
      }
    });
  });

  describe('login by IP', () => {
    before(() => startWith(buildRateLimits({ loginIp: 3, loginAccount: 100 })));
    after(stop);

    it('limits per IP across different accounts, so spraying many accounts is still blocked', async () => {
      for (const id of ['a', 'b', 'c']) assert.equal((await post('/login', { identifier: id })).status, 200);
      assert.equal((await post('/login', { identifier: 'd' })).status, 429);
    });
  });

  describe('change-password', () => {
    before(() => startWith(buildRateLimits({ changePassword: 2 })));
    after(stop);

    it('requires a session before anything else', async () => {
      assert.equal((await post('/change-password', {})).status, 401);
    });

    it('limits per signed-in user, not per IP', async () => {
      assert.equal((await post('/change-password', {}, { 'x-user': '1' })).status, 200);
      assert.equal((await post('/change-password', {}, { 'x-user': '1' })).status, 200);
      assert.equal((await post('/change-password', {}, { 'x-user': '1' })).status, 429);
      assert.equal((await post('/change-password', {}, { 'x-user': '2' })).status, 200);
    });

    it('does not count requests rejected for having no session', async () => {
      for (let i = 0; i < 5; i += 1) assert.equal((await post('/change-password', {})).status, 401);
      assert.equal((await post('/change-password', {}, { 'x-user': '9' })).status, 200);
    });
  });
});
