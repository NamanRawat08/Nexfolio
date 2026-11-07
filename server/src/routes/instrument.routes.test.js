import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInstrumentRouter } from './instrument.routes.js';

describe('instrument.routes', () => {
  const controller = { list() {}, get() {}, history() {} };
  const authMiddleware = (req, res, next) => next();

  it('requires controller and authMiddleware', () => {
    assert.throws(() => createInstrumentRouter({ authMiddleware }), /controller is required/);
    assert.throws(() => createInstrumentRouter({ controller }), /authMiddleware is required/);
  });

  it('registers auth first, then GET routes with history before :symbol', () => {
    const router = createInstrumentRouter({ controller, authMiddleware });
    const layers = router.stack;
    assert.equal(layers[0].handle, authMiddleware);
    const paths = layers.filter((l) => l.route).map((l) => l.route.path);
    assert.deepEqual(paths, ['/', '/:symbol/history', '/:symbol']);
    for (const l of layers.filter((x) => x.route)) {
      assert.deepEqual(Object.keys(l.route.methods), ['get']);
    }
  });
});
