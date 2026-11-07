import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthController } from './auth.controller.js';

describe('auth.controller changePassword', () => {
  const makeRes = () => ({
    statusCode: null,
    body: null,
    cookiesSet: [],
    status(c) { this.statusCode = c; return this; },
    json(d) { this.body = d; return this; },
    cookie(name, val, options) { this.cookiesSet.push({ name, val, options }); return this; },
  });

  it('uses the session user, sets a fresh httpOnly cookie and never returns the token', async () => {
    let received;
    const controller = createAuthController({
      authService: { async changePassword(id, body) { received = [id, body]; return { token: 'new.jwt.token' }; } },
      config: { nodeEnv: 'production' },
    });
    const res = makeRes();
    await controller.changePassword(
      { user: { id: '5' }, body: { currentPassword: 'a', newPassword: 'b', userId: '999' } },
      res,
      () => {}
    );

    assert.equal(received[0], '5');
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true });
    assert.equal(res.cookiesSet.length, 1);
    assert.equal(res.cookiesSet[0].name, 'nexfolio_token');
    assert.equal(res.cookiesSet[0].val, 'new.jwt.token');
    assert.equal(res.cookiesSet[0].options.httpOnly, true);
    assert.equal(res.cookiesSet[0].options.secure, true);
    assert.equal(res.cookiesSet[0].options.sameSite, 'lax');
    assert.ok(!JSON.stringify(res.body).includes('new.jwt.token'));
  });

  it('forwards service errors and sets no cookie', async () => {
    const boom = new Error('nope');
    const controller = createAuthController({ authService: { async changePassword() { throw boom; } } });
    const res = makeRes();
    let error;
    await controller.changePassword({ user: { id: '1' }, body: {} }, res, (e) => { error = e; });
    assert.equal(error, boom);
    assert.equal(res.cookiesSet.length, 0);
  });
});
