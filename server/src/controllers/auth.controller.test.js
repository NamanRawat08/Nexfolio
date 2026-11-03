import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthController } from './auth.controller.js';

describe('auth.controller', () => {
  function createMockRes() {
    return {
      statusCode: null,
      body: null,
      cookiesSet: [],
      cookiesCleared: [],
      sent: false,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      send(data) {
        this.sent = true;
        this.body = data ?? null;
        return this;
      },
      cookie(name, val, options) {
        this.cookiesSet.push({ name, val, options });
        return this;
      },
      clearCookie(name, options) {
        this.cookiesCleared.push({ name, options });
        return this;
      },
    };
  }

  describe('register', () => {
    it('returns 201 with created user shape and does not set auth cookie', async () => {
      const fakeAuthService = {
        async register(body) {
          return {
            id: '1',
            email: body.email,
            username: body.username,
            createdAt: '2026-01-01T00:00:00.000Z',
          };
        },
      };

      const controller = createAuthController({
        authService: fakeAuthService,
        config: { nodeEnv: 'development' },
      });

      const req = {
        body: {
          email: 'test@example.com',
          username: 'tester',
          password: 'SecretPassword123!',
        },
      };
      const res = createMockRes();

      await controller.register(req, res, () => {});

      assert.equal(res.statusCode, 201);
      assert.deepEqual(res.body, {
        user: {
          id: '1',
          email: 'test@example.com',
          username: 'tester',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      });
      assert.equal(res.cookiesSet.length, 0);
      assert.equal(JSON.stringify(res.body).includes('SecretPassword123!'), false);
    });
  });

  describe('login', () => {
    it('sets nexfolio_token cookie with exact options and body omits token (development mode)', async () => {
      const fakeToken = 'header.payload_with_fake_secret.signature';
      const fakeAuthService = {
        async login() {
          return {
            user: { id: '42', email: 'user@example.com', username: 'user_42' },
            token: fakeToken,
          };
        },
      };

      const controller = createAuthController({
        authService: fakeAuthService,
        config: { nodeEnv: 'development' },
      });

      const req = { body: { identifier: 'user@example.com', password: 'plainPassword' } };
      const res = createMockRes();

      await controller.login(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, {
        user: { id: '42', email: 'user@example.com', username: 'user_42' },
      });

      // Verify token NEVER appears in the response body
      assert.equal(res.body.token, undefined);
      assert.equal(JSON.stringify(res.body).includes(fakeToken), false);

      // Verify cookie options
      assert.equal(res.cookiesSet.length, 1);
      const cookie = res.cookiesSet[0];
      assert.equal(cookie.name, 'nexfolio_token');
      assert.equal(cookie.val, fakeToken);
      assert.equal(cookie.options.httpOnly, true);
      assert.equal(cookie.options.sameSite, 'lax');
      assert.equal(cookie.options.path, '/');
      assert.equal(cookie.options.maxAge, 86400000);
      assert.equal(cookie.options.secure, false); // secure is false in development
    });

    it('sets secure cookie flag when nodeEnv is production', async () => {
      const fakeAuthService = {
        async login() {
          return {
            user: { id: '42', email: 'user@example.com', username: 'user_42' },
            token: 'jwt.token.prod',
          };
        },
      };

      const controller = createAuthController({
        authService: fakeAuthService,
        config: { nodeEnv: 'production' },
      });

      const req = { body: { identifier: 'user@example.com', password: 'plainPassword' } };
      const res = createMockRes();

      await controller.login(req, res, () => {});

      assert.equal(res.cookiesSet.length, 1);
      const cookie = res.cookiesSet[0];
      assert.equal(cookie.options.secure, true); // secure is true in production
    });
  });

  describe('logout', () => {
    it('invalidates tokens, clears cookie with matching options, and returns 204 with no body', async () => {
      let loggedOutUserId = null;
      const fakeAuthService = {
        async logout(userId) {
          loggedOutUserId = userId;
        },
      };

      const controller = createAuthController({
        authService: fakeAuthService,
        config: { nodeEnv: 'development' },
      });

      const req = { user: { id: 'user-77', email: 'u@test.com', username: 'u77' } };
      const res = createMockRes();

      await controller.logout(req, res, () => {});

      assert.equal(loggedOutUserId, 'user-77');
      assert.equal(res.statusCode, 204);
      assert.equal(res.body, null);
      assert.equal(res.sent, true);

      assert.equal(res.cookiesCleared.length, 1);
      const cleared = res.cookiesCleared[0];
      assert.equal(cleared.name, 'nexfolio_token');
      assert.equal(cleared.options.httpOnly, true);
      assert.equal(cleared.options.sameSite, 'lax');
      assert.equal(cleared.options.path, '/');
      assert.equal(cleared.options.secure, false);
    });
  });

  describe('me', () => {
    it('returns safe current user shape with createdAt', async () => {
      const fakeAuthService = {
        async getCurrentUser(userId) {
          return {
            id: userId,
            email: 'me@example.com',
            username: 'me_myself',
            createdAt: '2026-03-01T12:00:00.000Z',
          };
        },
      };

      const controller = createAuthController({
        authService: fakeAuthService,
        config: { nodeEnv: 'development' },
      });

      const req = { user: { id: 'user-88' } };
      const res = createMockRes();

      await controller.me(req, res, () => {});

      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, {
        user: {
          id: 'user-88',
          email: 'me@example.com',
          username: 'me_myself',
          createdAt: '2026-03-01T12:00:00.000Z',
        },
      });
      assert.equal(res.body.password, undefined);
      assert.equal(res.body.password_hash, undefined);
    });
  });
});
