import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWatchlistRouter } from './watchlist.routes.js';

describe('watchlist.routes', () => {
  const auth = (req, res, next) => next();

  it('requires controller and authMiddleware', () => {
    assert.throws(() => createWatchlistRouter({ authMiddleware: auth }), /controller is required/);
    assert.throws(() => createWatchlistRouter({ controller: {} }), /authMiddleware is required/);
  });

  it('applies auth first and exposes GET /, PUT /:symbol and DELETE /:symbol', () => {
    const router = createWatchlistRouter({ controller: { list() {}, add() {}, remove() {} }, authMiddleware: auth });
    assert.equal(router.stack[0].handle, auth);
    const routes = router.stack.filter((l) => l.route).map((l) => [l.route.path, Object.keys(l.route.methods)[0]]);
    assert.deepEqual(routes, [['/', 'get'], ['/:symbol', 'put'], ['/:symbol', 'delete']]);
  });
});
