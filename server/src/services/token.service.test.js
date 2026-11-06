import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from './token.service.js';

describe('token.service', () => {
  const secret = 'valid_test_secret_with_32_characters_minimum_12345';
  const otherSecret = 'other_secret_with_32_characters_minimum_67890';

  it('signs and verifies a valid token successfully', () => {
    const token = signToken({ userId: 'user-123', tokenVersion: 1 }, secret);
    assert.equal(typeof token, 'string');

    const decoded = verifyToken(token, secret);
    assert.equal(decoded.userId, 'user-123');
    assert.equal(decoded.tokenVersion, 1);
  });

  it('token payload contains sub and tv, and omits sensitive/extra fields like email', () => {
    const token = signToken({ userId: 42, tokenVersion: 0 }, secret);
    const decodedRaw = jwt.decode(token);

    assert.equal(decodedRaw.sub, '42');
    assert.equal(decodedRaw.tv, 0);
    assert.equal(decodedRaw.email, undefined);
    assert.equal(typeof decodedRaw.iat, 'number');
    assert.equal(typeof decodedRaw.exp, 'number');
  });

  it('rejects tampered token', () => {
    const token = signToken({ userId: 'user-123', tokenVersion: 1 }, secret);
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'user-456', tv: 1 })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    assert.throws(
      () => verifyToken(tamperedToken, secret),
      (err) => err instanceof jwt.JsonWebTokenError
    );
  });

  it('rejects verification with incorrect secret', () => {
    const token = signToken({ userId: 'user-123', tokenVersion: 1 }, secret);

    assert.throws(
      () => verifyToken(token, otherSecret),
      (err) => err instanceof jwt.JsonWebTokenError
    );
  });

  it('rejects token with alg: none', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'user-123', tv: 1 })).toString('base64url');
    const unsignedToken = `${header}.${payload}.`;

    assert.throws(
      () => verifyToken(unsignedToken, secret),
      (err) => err instanceof jwt.JsonWebTokenError
    );
  });

  it('rejects token signed with an unpinned algorithm like HS512', () => {
    const hs512Token = jwt.sign(
      { sub: 'user-123', tv: 1 },
      secret,
      { algorithm: 'HS512' }
    );

    assert.throws(
      () => verifyToken(hs512Token, secret),
      (err) => err instanceof jwt.JsonWebTokenError
    );
  });

  it('rejects expired token', () => {
    const expiredToken = jwt.sign(
      { sub: 'user-123', tv: 1 },
      secret,
      { algorithm: 'HS256', expiresIn: -10 }
    );

    assert.throws(
      () => verifyToken(expiredToken, secret),
      (err) => err instanceof jwt.TokenExpiredError
    );
  });

  it('throws when secret is missing or invalid', () => {
    assert.throws(
      () => signToken({ userId: '1', tokenVersion: 0 }, null),
      /Secret is required/
    );
    assert.throws(
      () => verifyToken('some.jwt.token', ''),
      /Secret is required/
    );
  });
});
