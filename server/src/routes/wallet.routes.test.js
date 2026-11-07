import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWalletRouter } from './wallet.routes.js';

describe('wallet.routes', () => {
  const controller = { get() {} };
  const authMiddleware = (req, res, next) => next();

  it('requires controller and authMiddleware', () => {
    assert.throws(() => createWalletRouter({ authMiddleware }), /controller is required/);
    assert.throws(() => createWalletRouter({ controller }), /authMiddleware is required/);
  });

  it('applies auth first and exposes only GET /', () => {
    const router = createWalletRouter({ controller, authMiddleware });
    assert.equal(router.stack[0].handle, authMiddleware);
    const routes = router.stack.filter((l) => l.route);
    assert.deepEqual(routes.map((l) => l.route.path), ['/']);
    assert.deepEqual(Object.keys(routes[0].route.methods), ['get']);
  });
});
