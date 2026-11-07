import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInstrumentController } from './instrument.controller.js';

describe('instrument.controller', () => {
  function createMockRes() {
    return {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
  }

  const reliance = { id: '1', symbol: 'RELIANCE', name: 'Reliance', sector: 'Energy' };

  function setup(repoOverrides = {}) {
    const calls = {};
    const instrumentRepo = {
      async listInstruments(opts) {
        calls.list = opts;
        return [reliance];
      },
      async findBySymbol(symbol) {
        calls.find = symbol;
        return symbol === 'RELIANCE' ? reliance : null;
      },
      async getHistory(symbol, range) {
        calls.history = { symbol, range };
        return [{ date: '2026-01-01', close: '100.00' }];
      },
      ...repoOverrides,
    };
    return { controller: createInstrumentController({ instrumentRepo }), calls };
  }

  async function run(handler, req) {
    const res = createMockRes();
    let error = null;
    await handler({ query: {}, params: {}, ...req }, res, (err) => {
      error = err;
    });
    return { res, error };
  }

  it('throws when instrumentRepo is missing', () => {
    assert.throws(() => createInstrumentController(), /instrumentRepo is required/);
  });

  describe('list', () => {
    it('returns 200 with defaults', async () => {
      const { controller, calls } = setup();
      const { res } = await run(controller.list, {});
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, { instruments: [reliance] });
      assert.deepEqual(calls.list, { search: undefined, limit: 50, offset: 0 });
    });

    it('passes trimmed search, limit and offset', async () => {
      const { controller, calls } = setup();
      await run(controller.list, { query: { search: '  tcs ', limit: '10', offset: '20' } });
      assert.deepEqual(calls.list, { search: 'tcs', limit: 10, offset: 20 });
    });

    for (const query of [
      { limit: '0' },
      { limit: '101' },
      { limit: 'abc' },
      { limit: '-1' },
      { offset: '1.5' },
      { search: ['a', 'b'] },
      { search: 'x'.repeat(51) },
    ]) {
      it(`rejects invalid query ${JSON.stringify(query).slice(0, 40)} with 400`, async () => {
        const { controller } = setup();
        const { res, error } = await run(controller.list, { query });
        assert.equal(res.statusCode, null);
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, 'INVALID_QUERY');
      });
    }

    it('forwards repository errors to next', async () => {
      const boom = new Error('db down');
      const { controller } = setup({
        async listInstruments() {
          throw boom;
        },
      });
      const { error } = await run(controller.list, {});
      assert.equal(error, boom);
    });
  });

  describe('get', () => {
    it('returns 200 and uppercases the symbol', async () => {
      const { controller, calls } = setup();
      const { res } = await run(controller.get, { params: { symbol: 'reliance' } });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, { instrument: reliance });
      assert.equal(calls.find, 'RELIANCE');
    });

    it('returns 404 INSTRUMENT_NOT_FOUND for unknown symbol', async () => {
      const { controller } = setup();
      const { error } = await run(controller.get, { params: { symbol: 'NOPE' } });
      assert.equal(error.statusCode, 404);
      assert.equal(error.code, 'INSTRUMENT_NOT_FOUND');
    });

    it('returns 400 INVALID_SYMBOL for malformed symbol without hitting the repo', async () => {
      const { controller, calls } = setup();
      const { error } = await run(controller.get, { params: { symbol: "a'; DROP" } });
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, 'INVALID_SYMBOL');
      assert.equal(calls.find, undefined);
    });
  });

  describe('history', () => {
    it('defaults to 1Y', async () => {
      const { controller, calls } = setup();
      const { res } = await run(controller.history, { params: { symbol: 'RELIANCE' } });
      assert.equal(res.statusCode, 200);
      assert.deepEqual(calls.history, { symbol: 'RELIANCE', range: '1Y' });
      assert.equal(res.body.symbol, 'RELIANCE');
      assert.equal(res.body.range, '1Y');
      assert.equal(res.body.history.length, 1);
    });

    it('accepts lowercase range', async () => {
      const { controller, calls } = setup();
      await run(controller.history, { params: { symbol: 'RELIANCE' }, query: { range: '3m' } });
      assert.equal(calls.history.range, '3M');
    });

    for (const range of ['5Y', 'constructor', '__proto__', '']) {
      it(`rejects range "${range}" appropriately`, async () => {
        const { controller } = setup();
        const { res, error } = await run(controller.history, {
          params: { symbol: 'RELIANCE' },
          query: { range },
        });
        if (range === '') {
          assert.equal(res.statusCode, 200); // empty falls back to default
        } else {
          assert.equal(error.code, 'INVALID_RANGE');
        }
      });
    }

    it('returns 404 for unknown symbol', async () => {
      const { controller } = setup();
      const { error } = await run(controller.history, { params: { symbol: 'NOPE' } });
      assert.equal(error.code, 'INSTRUMENT_NOT_FOUND');
    });
  });
});
