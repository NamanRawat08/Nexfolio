import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderRouter } from './order.routes.js';
import { createHoldingRouter } from './holding.routes.js';

describe('order and holding routes', () => {
  const auth = (req, res, next) => next();

  it('orders: auth first, POST /, GET / and DELETE /:id', () => {
    const router = createOrderRouter({ controller: { place() {}, list() {}, cancel() {} }, authMiddleware: auth });
    assert.equal(router.stack[0].handle, auth);
    const routes = router.stack.filter((l) => l.route).map((l) => [l.route.path, Object.keys(l.route.methods)[0]]);
    assert.deepEqual(routes, [['/', 'post'], ['/', 'get'], ['/:id', 'delete']]);
  });

  it('holdings: auth first, GET / only', () => {
    const router = createHoldingRouter({ controller: { list() {} }, authMiddleware: auth });
    assert.equal(router.stack[0].handle, auth);
    const routes = router.stack.filter((l) => l.route);
    assert.deepEqual(routes.map((l) => Object.keys(l.route.methods)[0]), ['get']);
  });

  it('both require controller and authMiddleware', () => {
    assert.throws(() => createOrderRouter({ authMiddleware: auth }), /controller is required/);
    assert.throws(() => createOrderRouter({ controller: {} }), /authMiddleware is required/);
    assert.throws(() => createHoldingRouter({ authMiddleware: auth }), /controller is required/);
    assert.throws(() => createHoldingRouter({ controller: {} }), /authMiddleware is required/);
  });
});
