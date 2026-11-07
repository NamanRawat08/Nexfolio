import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from './auth.service.js';
import * as passwordService from './password.service.js';
import * as tokenService from './token.service.js';

const config = { jwtSecret: 'test_secret_for_auth_service_32_characters_long_min', bcryptCost: 4 };

async function setup({ password = 'OldPassword123' } = {}) {
  const user = {
    id: '7',
    passwordHash: await passwordService.hashPassword(password, 4),
    tokenVersion: 3,
  };
  const calls = { updates: [] };
  const userRepo = {
    async findPasswordHashById(id) {
      return String(id) === user.id ? { id: user.id, passwordHash: user.passwordHash } : null;
    },
    async updatePasswordHash(id, hash) {
      calls.updates.push([id, hash]);
      user.passwordHash = hash;
      user.tokenVersion += 1;
      return { id: user.id, tokenVersion: user.tokenVersion };
    },
  };
  const service = createAuthService({ userRepo, passwordService, tokenService, config });
  return { service, user, calls };
}

async function rejects(promise, code, status) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.code, code);
    assert.equal(err.statusCode, status);
    return true;
  });
}

describe('auth.service changePassword', () => {
  it('changes the password, bumps the token version and returns a token for the new version', async () => {
    const { service, user, calls } = await setup();
    const { token } = await service.changePassword('7', {
      currentPassword: 'OldPassword123',
      newPassword: 'BrandNewPass456',
    });

    assert.equal(calls.updates.length, 1);
    assert.equal(await passwordService.verifyPassword('BrandNewPass456', user.passwordHash), true);
    assert.equal(await passwordService.verifyPassword('OldPassword123', user.passwordHash), false);
    assert.notEqual(calls.updates[0][1], 'BrandNewPass456'); // stored hashed, never plain

    const payload = tokenService.verifyToken(token, config.jwtSecret);
    assert.equal(String(payload.userId), '7');
    assert.equal(payload.tokenVersion, 4);
  });

  it('rejects a wrong current password with 400 (not 401) and changes nothing', async () => {
    const { service, calls } = await setup();
    await rejects(
      service.changePassword('7', { currentPassword: 'WrongPassword1', newPassword: 'BrandNewPass456' }),
      'INVALID_CURRENT_PASSWORD',
      400
    );
    assert.equal(calls.updates.length, 0);
  });

  it('rejects a new password equal to the current one', async () => {
    const { service, calls } = await setup();
    await rejects(
      service.changePassword('7', { currentPassword: 'OldPassword123', newPassword: 'OldPassword123' }),
      'PASSWORD_UNCHANGED',
      400
    );
    assert.equal(calls.updates.length, 0);
  });

  it('applies the same rules as registration to the new password (8 to 72 bytes)', async () => {
    const { service, calls } = await setup();
    for (const newPassword of ['short', 'x'.repeat(73), '€'.repeat(25), 12345678, undefined, null]) {
      await rejects(
        service.changePassword('7', { currentPassword: 'OldPassword123', newPassword }),
        'VALIDATION_ERROR',
        400
      );
    }
    assert.equal(calls.updates.length, 0);
  });

  it('validates the current password and the request shape before touching the database', async () => {
    const { service, calls } = await setup();
    for (const params of [undefined, null, 'x', {}, { newPassword: 'BrandNewPass456' }, { currentPassword: 5, newPassword: 'BrandNewPass456' }, { currentPassword: '', newPassword: 'BrandNewPass456' }]) {
      await rejects(service.changePassword('7', params), 'VALIDATION_ERROR', 400);
    }
    await rejects(service.changePassword('', { currentPassword: 'a', newPassword: 'BrandNewPass456' }), 'VALIDATION_ERROR', 400);
    assert.equal(calls.updates.length, 0);
  });

  it('404s when the user no longer exists', async () => {
    const { service } = await setup();
    await rejects(
      service.changePassword('99', { currentPassword: 'OldPassword123', newPassword: 'BrandNewPass456' }),
      'USER_NOT_FOUND',
      404
    );
  });
});
