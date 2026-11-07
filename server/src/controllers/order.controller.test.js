import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderController } from './order.controller.js';

describe('order.controller', () => {
  const res = () => ({
    statusCode: null,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(d) {
      this.body = d;
      return this;
    },
  });

  const orderRow = {
    id: '1',
    symbol: 'TCS',
    side: 'BUY',
    quantity: '2',
    pricePaise: '10000',
    totalPaise: '20000',
    realizedPnlPaise: null,
  };

  function setup() {
    const calls = {};
    const controller = createOrderController({
      orderService: {
        async placeOrder(userId, input) {
          calls.place = { userId, input };
          return { order: orderRow, cashPaise: '99980000' };
        },
      },
      orderRepo: {
        async listByUser(userId, opts) {
          calls.list = { userId, opts };
          return [orderRow, { ...orderRow, id: '2', side: 'SELL', realizedPnlPaise: '-150' }];
        },
      },
    });
    return { controller, calls };
  }

  async function run(handler, req) {
    const r = res();
    let error = null;
    await handler({ query: {}, ...req }, r, (e) => {
      error = e;
    });
    return { r, error };
  }

  it('requires its dependencies', () => {
    assert.throws(() => createOrderController({ orderRepo: {} }), /orderService is required/);
    assert.throws(() => createOrderController({ orderService: {} }), /orderRepo is required/);
  });

  describe('place', () => {
    it('returns 201 with order, rupee strings and updated wallet; uses req.user only', async () => {
      const { controller, calls } = setup();
      const { r } = await run(controller.place, {
        user: { id: '9' },
        body: { symbol: 'TCS', side: 'BUY', quantity: 2, userId: '1', extra: 'x' },
      });
      assert.equal(r.statusCode, 201);
      assert.deepEqual(calls.place, { userId: '9', input: { symbol: 'TCS', side: 'BUY', quantity: 2 } });
      assert.equal(r.body.order.price, '100.00');
      assert.equal(r.body.order.total, '200.00');
      assert.equal(r.body.order.realizedPnl, null);
      assert.deepEqual(r.body.wallet, { cashPaise: '99980000', cash: '999800.00', currency: 'INR' });
    });

    for (const body of [undefined, null, 'x', [1]]) {
      it(`rejects body ${JSON.stringify(body)} with 400`, async () => {
        const { controller } = setup();
        const { error } = await run(controller.place, { user: { id: '1' }, body });
        assert.equal(error.statusCode, 400);
      });
    }

    it('forwards service errors', async () => {
      const boom = new Error('x');
      const controller = createOrderController({
        orderService: {
          async placeOrder() {
            throw boom;
          },
        },
        orderRepo: {},
      });
      const { error } = await run(controller.place, { user: { id: '1' }, body: {} });
      assert.equal(error, boom);
    });
  });

  describe('list', () => {
    it('returns orders for the signed-in user with defaults', async () => {
      const { controller, calls } = setup();
      const { r } = await run(controller.list, { user: { id: '9' } });
      assert.equal(r.statusCode, 200);
      assert.deepEqual(calls.list, { userId: '9', opts: { limit: 50, offset: 0 } });
      assert.equal(r.body.orders[1].realizedPnl, '-1.50');
    });

    for (const query of [{ limit: '0' }, { limit: '101' }, { offset: '-1' }, { limit: ['1', '2'] }, { limit: 'x' }]) {
      it(`rejects ${JSON.stringify(query)} with 400`, async () => {
        const { controller } = setup();
        const { error } = await run(controller.list, { user: { id: '1' }, query });
        assert.equal(error.code, 'INVALID_QUERY');
      });
    }
  });
});
