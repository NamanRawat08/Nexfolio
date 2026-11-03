import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createAuthMiddleware } from './auth.middleware.js';
import { AppError } from '../utils/AppError.js';
import * as tokenService from '../services/token.service.js';

describe('auth.middleware', () => {
  const secret = 'valid_test_secret_for_middleware_testing_min32chars';
  const config = { jwtSecret: secret };

  function createFakeUserRepo(users = []) {
    return {
      async findById(id) {
        return users.find((u) => String(u.id) === String(id)) || null;
      },
    };
  }

  function createMockReqRes(cookies = {}) {
    const req = {
      cookies,
      user: null,
    };
    let nextError = null;
    let nextCalled = false;
    const next = (err) => {
      nextCalled = true;
      if (err) nextError = err;
    };
    return { req, next: () => nextCalled, getError: () => nextError, rawNext: next };
  }

  it('rejects with 401 UNAUTHENTICATED when cookie is missing', async () => {
    const middleware = createAuthMiddleware({
      tokenService,
      userRepo: createFakeUserRepo([]),
      config,
    });

    const { req, rawNext, getError } = createMockReqRes({});
    await middleware(req, {}, rawNext);

    const err = getError();
    assert.equal(err instanceof AppError, true);
    assert.equal(err.statusCode, 401);
    assert.equal(err.code, 'UNAUTHENTICATED');
    assert.equal(err.message, 'Authentication required');
    assert.equal(req.user, null);
  });

  it('rejects with 401 UNAUTHENTICATED when token is garbage or invalid', async () => {
    const middleware = createAuthMiddleware({
      tokenService,
      userRepo: createFakeUserRepo([]),
      config,
    });

    const { req, rawNext, getError } = createMockReqRes({ nexfolio_token: 'garbage.invalid.token' });
    await middleware(req, {}, rawNext);

    const err = getError();
    assert.equal(err instanceof AppError, true);
    assert.equal(err.statusCode, 401);
    assert.equal(err.code, 'UNAUTHENTICATED');
    assert.equal(err.message, 'Authentication required');
  });

  it('rejects with 401 UNAUTHENTICATED when token is expired', async () => {
    const expiredToken = jwt.sign(
      { sub: 'user-1', tv: 0 },
      secret,
      { algorithm: 'HS256', expiresIn: -10 }
    );
    const middleware = createAuthMiddleware({
      tokenService,
      userRepo: createFakeUserRepo([{ id: 'user-1', token_version: 0 }]),
      config,
    });

    const { req, rawNext, getError } = createMockReqRes({ nexfolio_token: expiredToken });
    await middleware(req, {}, rawNext);

    const err = getError();
    assert.equal(err instanceof AppError, true);
    assert.equal(err.statusCode, 401);
    assert.equal(err.code, 'UNAUTHENTICATED');
    assert.equal(err.message, 'Authentication required');
  });

  it('rejects with 401 UNAUTHENTICATED when token uses unpinned algorithm like HS512', async () => {
    const hs512Token = jwt.sign(
      { sub: 'user-1', tv: 0 },
      secret,
      { algorithm: 'HS512' }
    );
    const middleware = createAuthMiddleware({
      tokenService,
      userRepo: createFakeUserRepo([{ id: 'user-1', token_version: 0 }]),
      config,
    });

    const { req, rawNext, getError } = createMockReqRes({ nexfolio_token: hs512Token });
    await middleware(req, {}, rawNext);

    const err = getError();
    assert.equal(err instanceof AppError, true);
    assert.equal(err.statusCode, 401);
    assert.equal(err.code, 'UNAUTHENTICATED');
    assert.equal(err.message, 'Authentication required');
  });

  it('rejects with 401 UNAUTHENTICATED when user does not exist in database (deleted user)', async () => {
    const validToken = tokenService.signToken({ userId: 'ghost-user', tokenVersion: 0 }, secret);
    const middleware = createAuthMiddleware({
      tokenService,
      userRepo: createFakeUserRepo([]), // Empty database
      config,
    });

    const { req, rawNext, getError } = createMockReqRes({ nexfolio_token: validToken });
    await middleware(req, {}, rawNext);

    const err = getError();
    assert.equal(err instanceof AppError, true);
    assert.equal(err.statusCode, 401);
    assert.equal(err.code, 'UNAUTHENTICATED');
    assert.equal(err.message, 'Authentication required');
  });

  it('rejects with 401 UNAUTHENTICATED when token_version mismatches (revoked token)', async () => {
    const oldToken = tokenService.signToken({ userId: 'user-1', tokenVersion: 0 }, secret);
    const middleware = createAuthMiddleware({
      tokenService,
      userRepo: createFakeUserRepo([
        { id: 'user-1', email: 'u@test.com', username: 'user1', token_version: 1 }, // Bumped to 1
      ]),
      config,
    });

    const { req, rawNext, getError } = createMockReqRes({ nexfolio_token: oldToken });
    await middleware(req, {}, rawNext);

    const err = getError();
    assert.equal(err instanceof AppError, true);
    assert.equal(err.statusCode, 401);
    assert.equal(err.code, 'UNAUTHENTICATED');
    assert.equal(err.message, 'Authentication required');
  });

  it('attaches safe req.user on valid token and never includes password_hash or token_version', async () => {
    const validToken = tokenService.signToken({ userId: 'user-42', tokenVersion: 2 }, secret);
    const middleware = createAuthMiddleware({
      tokenService,
      userRepo: createFakeUserRepo([
        {
          id: 'user-42',
          email: 'valid@example.com',
          username: 'valid_user',
          password_hash: 'secret_bcrypt_hash_never_leak',
          token_version: 2,
        },
      ]),
      config,
    });

    const { req, rawNext, getError } = createMockReqRes({ nexfolio_token: validToken });
    await middleware(req, {}, rawNext);

    assert.equal(getError(), null);
    assert.deepEqual(req.user, {
      id: 'user-42',
      email: 'valid@example.com',
      username: 'valid_user',
    });
    assert.equal(req.user.password_hash, undefined);
    assert.equal(req.user.token_version, undefined);
    assert.equal(req.user.tokenVersion, undefined);
  });
});
