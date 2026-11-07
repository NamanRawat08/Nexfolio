import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderService, MAX_PENDING_ORDERS } from './order.service.js';

/** In-memory fakes with snapshot/rollback, extended for pending orders and cancels. */
function setup({ cash = 1000000n, price = '100.00', holding = null, reserved, existingOrder } = {}) {
  const state = {
    cash,
    holding,
    orders: [],
    cancelled: [],
    reserved: reserved ?? { cashPaise: 0n, sharesByInstrument: new Map(), count: 0 },
  };
  const instrument = { id: '1', symbol: 'TCS', latestClose: price, latestTradeDate: '2026-11-07' };

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
      async lockForUser(orderId) {
        return existingOrder && existingOrder.id === orderId ? existingOrder : null;
      },
      async markCancelled(id) {
        state.cancelled.push(id);
        return { id, status: 'CANCELLED' };
      },
    },
    instrument: {
      async findBySymbol(symbol) {
        return symbol === 'TCS' ? instrument : null;
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

  return { service: createOrderService({ withTransaction, createRepos: () => repos }), state };
}

const limit = (side, quantity, limitPrice, extra = {}) => ({ symbol: 'TCS', side, quantity, orderType: 'LIMIT', limitPrice, ...extra });

async function rejects(promise, code, status) {
  await assert.rejects(promise, (err) => {
    assert.equal(err.code, code);
    if (status) assert.equal(err.statusCode, status);
    return true;
  });
}

describe('limit order validation', () => {
  for (const [name, input, code] of [
    ['missing limit price', { symbol: 'TCS', side: 'BUY', quantity: 1, orderType: 'LIMIT' }, 'VALIDATION_ERROR'],
    ['numeric limit price', limit('BUY', 1, 99.5), 'VALIDATION_ERROR'],
    ['three decimals', limit('BUY', 1, '99.555'), 'VALIDATION_ERROR'],
    ['negative price', limit('BUY', 1, '-5'), 'VALIDATION_ERROR'],
    ['zero price', limit('BUY', 1, '0'), 'VALIDATION_ERROR'],
    ['above the maximum', limit('BUY', 1, '10000000'), 'VALIDATION_ERROR'],
    ['unknown order type', { symbol: 'TCS', side: 'BUY', quantity: 1, orderType: 'STOP' }, 'VALIDATION_ERROR'],
    ['limit price on a market order', { symbol: 'TCS', side: 'BUY', quantity: 1, limitPrice: '10.00' }, 'VALIDATION_ERROR'],
  ]) {
    it(`rejects ${name} with 400 and no side effects`, async () => {
      const { service, state } = setup();
      await rejects(service.placeOrder('1', input), code, 400);
      assert.equal(state.orders.length, 0);
      assert.equal(state.cash, 1000000n);
    });
  }

  it('accepts a lowercase order type', async () => {
    const { service, state } = setup({ price: '100.00' });
    await service.placeOrder('1', limit('buy', 1, '90.00', { orderType: 'limit' }));
    assert.equal(state.orders[0].orderType, 'LIMIT');
  });
});

describe('limit BUY', () => {
  it('fills immediately at the latest close when it is at or below the limit', async () => {
    const { service, state } = setup({ price: '100.00' });
    const { order, cashPaise } = await service.placeOrder('1', limit('BUY', 5, '105.00'));
    assert.equal(order.status, 'FILLED');
    assert.equal(order.pricePaise, 10000n); // the market price, better than the limit
    assert.equal(order.limitPricePaise, 10500n);
    assert.equal(order.totalPaise, 50000n);
    assert.equal(state.cash, 950000n);
    assert.equal(cashPaise, '950000');
    assert.deepEqual(state.holding, { quantity: 5n, totalCostPaise: 50000n });
  });

  it('fills immediately when the limit equals the latest close', async () => {
    const { service } = setup({ price: '100.00' });
    const { order } = await service.placeOrder('1', limit('BUY', 1, '100.00'));
    assert.equal(order.status, 'FILLED');
  });

  it('stays pending when the price is above the limit, changing no cash or shares', async () => {
    const { service, state } = setup({ price: '100.00' });
    const { order, cashPaise } = await service.placeOrder('1', limit('BUY', 5, '90.00'));
    assert.equal(order.status, 'PENDING');
    assert.equal(order.limitPricePaise, 9000n);
    assert.equal(order.placedPriceDate, '2026-11-07');
    assert.equal(order.pricePaise ?? null, null); // no fill yet
    assert.equal(cashPaise, '1000000');
    assert.equal(state.cash, 1000000n);
    assert.equal(state.holding, null);
  });

  it('rejects a pending buy whose limit value exceeds available cash (cash minus reservations)', async () => {
    const { service, state } = setup({
      cash: 100000n,
      reserved: { cashPaise: 60000n, sharesByInstrument: new Map(), count: 1 },
    });
    // available = 40000; 5 × 90.00 = 45000 > 40000
    await rejects(service.placeOrder('1', limit('BUY', 5, '90.00')), 'INSUFFICIENT_FUNDS', 422);
    assert.equal(state.orders.length, 0);
    // 4 × 90.00 = 36000 fits
    const { order } = await service.placeOrder('1', limit('BUY', 4, '90.00'));
    assert.equal(order.status, 'PENDING');
  });

  it('a market buy cannot spend cash that is reserved for pending orders', async () => {
    const { service } = setup({
      cash: 100000n,
      price: '100.00',
      reserved: { cashPaise: 60000n, sharesByInstrument: new Map(), count: 1 },
    });
    await rejects(service.placeOrder('1', { symbol: 'TCS', side: 'BUY', quantity: 5 }), 'INSUFFICIENT_FUNDS', 422); // 50000 > 40000
    const { order } = await service.placeOrder('1', { symbol: 'TCS', side: 'BUY', quantity: 4 }); // 40000 fits exactly
    assert.equal(order.status, 'FILLED');
  });
});

describe('limit SELL', () => {
  const owned = { quantity: 10n, totalCostPaise: 80000n };

  it('fills immediately at the latest close when it is at or above the limit', async () => {
    const { service, state } = setup({ price: '100.00', holding: owned, cash: 0n });
    const { order } = await service.placeOrder('1', limit('SELL', 4, '95.00'));
    assert.equal(order.status, 'FILLED');
    assert.equal(order.pricePaise, 10000n);
    assert.equal(state.cash, 40000n);
    assert.equal(order.realizedPnlPaise, 40000n - 32000n);
    assert.deepEqual(state.holding, { quantity: 6n, totalCostPaise: 48000n });
  });

  it('stays pending when the price is below the limit', async () => {
    const { service, state } = setup({ price: '100.00', holding: owned });
    const { order } = await service.placeOrder('1', limit('SELL', 4, '120.00'));
    assert.equal(order.status, 'PENDING');
    assert.deepEqual(state.holding, owned);
  });

  it('cannot reserve more shares than are free, and a market sell cannot use reserved shares', async () => {
    const reserved = { cashPaise: 0n, sharesByInstrument: new Map([['1', 8n]]), count: 1 };
    const a = setup({ price: '100.00', holding: owned, reserved });
    await rejects(a.service.placeOrder('1', limit('SELL', 3, '120.00')), 'INSUFFICIENT_HOLDINGS', 422); // 2 free
    const b = setup({ price: '100.00', holding: owned, reserved });
    await rejects(b.service.placeOrder('1', { symbol: 'TCS', side: 'SELL', quantity: 3 }), 'INSUFFICIENT_HOLDINGS', 422);
    const c = setup({ price: '100.00', holding: owned, reserved });
    const { order } = await c.service.placeOrder('1', limit('SELL', 2, '120.00'));
    assert.equal(order.status, 'PENDING');
  });

  it('rejects a limit sell with no position', async () => {
    const { service } = setup({ price: '100.00' });
    await rejects(service.placeOrder('1', limit('SELL', 1, '120.00')), 'INSUFFICIENT_HOLDINGS', 422);
  });
});

describe('pending order limit', () => {
  it(`rejects the ${MAX_PENDING_ORDERS + 1}th open order`, async () => {
    const { service, state } = setup({
      reserved: { cashPaise: 0n, sharesByInstrument: new Map(), count: MAX_PENDING_ORDERS },
    });
    await rejects(service.placeOrder('1', limit('BUY', 1, '50.00')), 'TOO_MANY_PENDING_ORDERS', 409);
    assert.equal(state.orders.length, 0);
  });

  it('does not count against the cap when the order fills immediately', async () => {
    const { service } = setup({
      price: '100.00',
      reserved: { cashPaise: 0n, sharesByInstrument: new Map(), count: MAX_PENDING_ORDERS },
    });
    const { order } = await service.placeOrder('1', limit('BUY', 1, '150.00'));
    assert.equal(order.status, 'FILLED');
  });
});

describe('cancelOrder', () => {
  it('cancels a pending order', async () => {
    const { service, state } = setup({ existingOrder: { id: '12', status: 'PENDING' } });
    const cancelled = await service.cancelOrder('1', '12');
    assert.equal(cancelled.status, 'CANCELLED');
    assert.deepEqual(state.cancelled, ['12']);
  });

  it('404s for an unknown order or one that belongs to someone else (lock returns null)', async () => {
    const { service } = setup();
    await rejects(service.cancelOrder('1', '99'), 'ORDER_NOT_FOUND', 404);
  });

  it('409s when the order is already filled or cancelled', async () => {
    for (const status of ['FILLED', 'CANCELLED']) {
      const { service, state } = setup({ existingOrder: { id: '5', status } });
      await rejects(service.cancelOrder('1', '5'), 'ORDER_NOT_PENDING', 409);
      assert.equal(state.cancelled.length, 0);
    }
  });

  it('rejects malformed ids with 400 before touching the database', async () => {
    const { service } = setup();
    for (const id of ['abc', '1; DROP', '', '-1', 5, undefined]) {
      await rejects(service.cancelOrder('1', id), 'INVALID_ORDER_ID', 400);
    }
  });
});
