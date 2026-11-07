import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderService } from './order.service.js';

/**
 * In-memory fake of the repositories plus a transaction that snapshots state and
 * restores it when the callback throws, mimicking ROLLBACK.
 */
function setup({ cash = 100000000n, price = '100.00', holding = null, instrument, reserved } = {}) {
  const state = {
    cash,
    holding,
    orders: [],
    reserved: { cashPaise: 0n, sharesByInstrument: new Map(), count: 0 },
    instrument:
      instrument === undefined ? { id: '1', symbol: 'TCS', latestClose: price, latestTradeDate: '2026-11-07' } : instrument,
  };

  if (reserved) state.reserved = reserved;

  const repos = {
    wallet: {
      async lockByUserId() {
        return { cashPaise: state.cash.toString() };
      },
      async setCash(_u, v) {
        state.cash = BigInt(v);
      },
    },
    holding: {
      async findForUpdate() {
        return state.holding ? { ...state.holding } : null;
      },
      async upsert(_u, _i, pos) {
        state.holding = { ...pos };
      },
      async remove() {
        state.holding = null;
      },
    },
    order: {
      async reservedForUser() {
        return state.reserved;
      },
      async create(o) {
        state.orders.push(o);
        return { id: String(state.orders.length), symbol: 'TCS', ...o };
      },
    },
    instrument: {
      async findBySymbol(symbol) {
        return state.instrument && symbol === state.instrument.symbol ? state.instrument : null;
      },
    },
  };

  const withTransaction = async (fn) => {
    const snapshot = { cash: state.cash, holding: state.holding && { ...state.holding }, orders: [...state.orders] };
    try {
      return await fn(() => {});
    } catch (err) {
      Object.assign(state, snapshot);
      throw err;
    }
  };

  const service = createOrderService({ withTransaction, createRepos: () => repos });
  return { service, state };
}

async function rejects(promise, code, status) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.code, code);
    if (status) assert.equal(err.statusCode, status);
    return true;
  });
}

describe('order.service', () => {
  it('requires its dependencies', () => {
    assert.throws(() => createOrderService({ createRepos() {} }), /withTransaction is required/);
    assert.throws(() => createOrderService({ withTransaction() {} }), /createRepos is required/);
  });

  describe('validation', () => {
    for (const [name, input] of [
      ['bad symbol', { symbol: "x'; --", side: 'BUY', quantity: 1 }],
      ['bad side', { symbol: 'TCS', side: 'HOLD', quantity: 1 }],
      ['zero quantity', { symbol: 'TCS', side: 'BUY', quantity: 0 }],
      ['negative quantity', { symbol: 'TCS', side: 'BUY', quantity: -5 }],
      ['fractional quantity', { symbol: 'TCS', side: 'BUY', quantity: 1.5 }],
      ['string quantity', { symbol: 'TCS', side: 'BUY', quantity: '5' }],
      ['huge quantity', { symbol: 'TCS', side: 'BUY', quantity: 1_000_001 }],
      ['missing input', undefined],
    ]) {
      it(`rejects ${name} with 400 and no side effects`, async () => {
        const { service, state } = setup();
        await rejects(service.placeOrder('1', input), 'VALIDATION_ERROR', 400);
        assert.equal(state.cash, 100000000n);
        assert.equal(state.orders.length, 0);
      });
    }
  });

  describe('BUY', () => {
    it('debits cash, creates the holding and logs the order', async () => {
      const { service, state } = setup({ price: '1234.56' });
      const { order, cashPaise } = await service.placeOrder('1', { symbol: 'tcs', side: 'buy', quantity: 10 });
      assert.equal(state.cash, 100000000n - 1234560n);
      assert.equal(cashPaise, state.cash.toString());
      assert.deepEqual(state.holding, { quantity: 10n, totalCostPaise: 1234560n });
      assert.equal(order.side, 'BUY');
      assert.equal(order.pricePaise, 123456n);
      assert.equal(order.totalPaise, 1234560n);
      assert.equal(order.realizedPnlPaise, null);
    });

    it('adds to an existing position and accumulates cost basis', async () => {
      const { service, state } = setup({ price: '100.00', holding: { quantity: 5n, totalCostPaise: 40000n } });
      await service.placeOrder('1', { symbol: 'TCS', side: 'BUY', quantity: 5 });
      assert.deepEqual(state.holding, { quantity: 10n, totalCostPaise: 90000n });
    });

    it('allows spending exactly all cash', async () => {
      const { service, state } = setup({ cash: 10000n, price: '100.00' });
      await service.placeOrder('1', { symbol: 'TCS', side: 'BUY', quantity: 1 });
      assert.equal(state.cash, 0n);
    });

    it('rejects when cash is short, leaving everything untouched', async () => {
      const { service, state } = setup({ cash: 9999n, price: '100.00' });
      await rejects(service.placeOrder('1', { symbol: 'TCS', side: 'BUY', quantity: 1 }), 'INSUFFICIENT_FUNDS', 422);
      assert.equal(state.cash, 9999n);
      assert.equal(state.holding, null);
      assert.equal(state.orders.length, 0);
    });
  });

  describe('SELL', () => {
    it('credits cash, reduces the position pro rata and records realized P&L', async () => {
      const { service, state } = setup({
        cash: 0n,
        price: '150.00',
        holding: { quantity: 10n, totalCostPaise: 100000n },
      });
      const { order } = await service.placeOrder('1', { symbol: 'TCS', side: 'SELL', quantity: 4 });
      assert.equal(state.cash, 60000n);
      assert.deepEqual(state.holding, { quantity: 6n, totalCostPaise: 60000n });
      assert.equal(order.realizedPnlPaise, 60000n - 40000n);
    });

    it('removes the holding when everything is sold, using the full remaining cost', async () => {
      const { service, state } = setup({
        cash: 0n,
        price: '10.00',
        holding: { quantity: 3n, totalCostPaise: 1001n },
      });
      const { order } = await service.placeOrder('1', { symbol: 'TCS', side: 'SELL', quantity: 3 });
      assert.equal(state.holding, null);
      assert.equal(order.realizedPnlPaise, 3000n - 1001n);
    });

    it('records a loss as a negative realized P&L', async () => {
      const { service } = setup({ price: '10.00', holding: { quantity: 1n, totalCostPaise: 5000n } });
      const { order } = await service.placeOrder('1', { symbol: 'TCS', side: 'SELL', quantity: 1 });
      assert.equal(order.realizedPnlPaise, -4000n);
    });

    it('rejects selling more than owned or with no position', async () => {
      const owned = setup({ holding: { quantity: 2n, totalCostPaise: 200n } });
      await rejects(owned.service.placeOrder('1', { symbol: 'TCS', side: 'SELL', quantity: 3 }), 'INSUFFICIENT_HOLDINGS', 422);
      assert.equal(owned.state.holding.quantity, 2n);

      const none = setup();
      await rejects(none.service.placeOrder('1', { symbol: 'TCS', side: 'SELL', quantity: 1 }), 'INSUFFICIENT_HOLDINGS', 422);
      assert.equal(none.state.cash, 100000000n);
    });
  });

  describe('instrument problems', () => {
    it('404s on unknown symbol', async () => {
      const { service } = setup({ instrument: null });
      await rejects(service.placeOrder('1', { symbol: 'TCS', side: 'BUY', quantity: 1 }), 'INSTRUMENT_NOT_FOUND', 404);
    });

    it('409s when the instrument has no price', async () => {
      const { service } = setup({ instrument: { id: '1', symbol: 'TCS', latestClose: null } });
      await rejects(service.placeOrder('1', { symbol: 'TCS', side: 'BUY', quantity: 1 }), 'NO_PRICE_AVAILABLE', 409);
    });
  });

  it('rolls back when a later step fails', async () => {
    const { service, state } = setup({ price: '100.00' });
    const failing = createOrderService({
      withTransaction: async (fn) => {
        const snapshot = { cash: state.cash, holding: state.holding };
        try {
          return await fn(() => {});
        } catch (e) {
          Object.assign(state, snapshot);
          throw e;
        }
      },
      createRepos: () => ({
        wallet: {
          async lockByUserId() {
            return { cashPaise: state.cash.toString() };
          },
          async setCash(_u, v) {
            state.cash = BigInt(v);
          },
        },
        holding: {
          async findForUpdate() {
            return null;
          },
          async upsert(_u, _i, pos) {
            state.holding = pos;
          },
        },
        order: {
          async reservedForUser() {
            return { cashPaise: 0n, sharesByInstrument: new Map(), count: 0 };
          },
          async create() {
            throw new Error('disk full');
          },
        },
        instrument: { async findBySymbol() { return { id: '1', symbol: 'TCS', latestClose: '100.00' }; } },
      }),
    });
    await assert.rejects(failing.placeOrder('1', { symbol: 'TCS', side: 'BUY', quantity: 1 }), /disk full/);
    assert.equal(state.cash, 100000000n);
    assert.equal(state.holding, null);
    void service;
  });
});
