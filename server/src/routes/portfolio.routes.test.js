import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPortfolioRouter } from './portfolio.routes.js';

describe('portfolio.routes', () => {
  const auth = (req, res, next) => next();

  it('requires controller and authMiddleware', () => {
    assert.throws(() => createPortfolioRouter({ authMiddleware: auth }), /controller is required/);
    assert.throws(() => createPortfolioRouter({ controller: {} }), /authMiddleware is required/);
  });

  it('applies auth first and exposes only GET /summary', () => {
    const router = createPortfolioRouter({ controller: { summary() {} }, authMiddleware: auth });
    assert.equal(router.stack[0].handle, auth);
    const routes = router.stack.filter((l) => l.route);
    assert.deepEqual(routes.map((l) => [l.route.path, Object.keys(l.route.methods)[0]]), [['/summary', 'get']]);
  });
});
