import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWatchlistController, toWatchlistView, MAX_WATCHLIST_ITEMS } from './watchlist.controller.js';

describe('toWatchlistView', () => {
  it('computes the day change in paise-exact rupees and a ratio', () => {
    const v = toWatchlistView({ symbol: 'X', latestClose: '2019.73', previousClose: '2059.21' });
    assert.equal(v.change, '-39.48');
    assert.ok(Math.abs(v.changePercent - -3948 / 205921) < 1e-12);
  });

  it('leaves the change null without both prices', () => {
    for (const row of [
      { latestClose: null, previousClose: null },
      { latestClose: '10.00', previousClose: null },
    ]) {
      const v = toWatchlistView(row);
      assert.equal(v.change, null);
      assert.equal(v.changePercent, null);
    }
  });
});

describe('watchlist.controller', () => {
  const res = () => ({
    statusCode: null,
    body: undefined,
    sent: false,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.body = d; return this; },
    send() { this.sent = true; return this; },
  });

  function setup({ status = { count: 0, hasInstrument: false }, instrument = { id: '5', symbol: 'TCS' }, added = true } = {}) {
    const calls = { add: [], remove: [], status: [] };
    const watchlistRepo = {
      async listByUser(id) { calls.list = id; return [{ symbol: 'TCS', latestClose: '110.00', previousClose: '100.00' }]; },
      async getStatus(u, i) { calls.status.push([u, i]); return status; },
      async add(u, i) { calls.add.push([u, i]); return added; },
      async removeBySymbol(u, s) { calls.remove.push([u, s]); return true; },
    };
    const instrumentRepo = { async findBySymbol(s) { calls.find = s; return instrument; } };
    return { controller: createWatchlistController({ watchlistRepo, instrumentRepo }), calls };
  }

  async function run(handler, req) {
    const r = res();
    let error = null;
    await handler({ params: {}, ...req }, r, (e) => { error = e; });
    return { r, error };
  }

  it('requires its dependencies', () => {
    assert.throws(() => createWatchlistController({ instrumentRepo: {} }), /watchlistRepo is required/);
    assert.throws(() => createWatchlistController({ watchlistRepo: {} }), /instrumentRepo is required/);
  });

  it('list returns the signed-in user\'s items with day change', async () => {
    const { controller, calls } = setup();
    const { r } = await run(controller.list, { user: { id: '9' } });
    assert.equal(calls.list, '9');
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.watchlist[0].change, '10.00');
    assert.ok(Math.abs(r.body.watchlist[0].changePercent - 0.1) < 1e-12);
  });

  describe('add', () => {
    it('adds a new instrument with 201, uppercasing the symbol and using req.user', async () => {
      const { controller, calls } = setup();
      const { r } = await run(controller.add, { user: { id: '9' }, params: { symbol: 'tcs' } });
      assert.equal(r.statusCode, 201);
      assert.deepEqual(r.body, { symbol: 'TCS', watching: true });
      assert.equal(calls.find, 'TCS');
      assert.deepEqual(calls.add, [['9', '5']]);
    });

    it('is idempotent: already watching returns 200 without inserting', async () => {
      const { controller, calls } = setup({ status: { count: 3, hasInstrument: true } });
      const { r } = await run(controller.add, { user: { id: '9' }, params: { symbol: 'TCS' } });
      assert.equal(r.statusCode, 200);
      assert.equal(calls.add.length, 0);
    });

    it('rejects when the list is full, but still allows re-adding an existing item', async () => {
      const full = setup({ status: { count: MAX_WATCHLIST_ITEMS, hasInstrument: false } });
      const { error } = await run(full.controller.add, { user: { id: '1' }, params: { symbol: 'TCS' } });
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, 'WATCHLIST_FULL');
      assert.equal(full.calls.add.length, 0);

      const existing = setup({ status: { count: MAX_WATCHLIST_ITEMS, hasInstrument: true } });
      const { r } = await run(existing.controller.add, { user: { id: '1' }, params: { symbol: 'TCS' } });
      assert.equal(r.statusCode, 200);
    });

    it('404s for an unknown instrument and 400s for a malformed symbol', async () => {
      const unknown = setup({ instrument: null });
      assert.equal((await run(unknown.controller.add, { user: { id: '1' }, params: { symbol: 'NOPE' } })).error.code, 'INSTRUMENT_NOT_FOUND');

      const bad = setup();
      const { error } = await run(bad.controller.add, { user: { id: '1' }, params: { symbol: "x'; --" } });
      assert.equal(error.code, 'INVALID_SYMBOL');
      assert.equal(bad.calls.find, undefined);
    });
  });

  describe('remove', () => {
    it('removes for the signed-in user and returns 204', async () => {
      const { controller, calls } = setup();
      const { r } = await run(controller.remove, { user: { id: '9' }, params: { symbol: 'tcs' } });
      assert.equal(r.statusCode, 204);
      assert.equal(r.sent, true);
      assert.deepEqual(calls.remove, [['9', 'TCS']]);
    });

    it('rejects a malformed symbol', async () => {
      const { controller, calls } = setup();
      const { error } = await run(controller.remove, { user: { id: '1' }, params: { symbol: '../x' } });
      assert.equal(error.code, 'INVALID_SYMBOL');
      assert.equal(calls.remove.length, 0);
    });
  });

  it('forwards repository errors', async () => {
    const boom = new Error('db');
    const c = createWatchlistController({
      watchlistRepo: { listByUser: async () => { throw boom; } },
      instrumentRepo: {},
    });
    const { error } = await run(c.list, { user: { id: '1' } });
    assert.equal(error, boom);
  });
});
