import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHoldingController, toHoldingView } from './holding.controller.js';

describe('holding.controller', () => {
  it('toHoldingView derives value, average cost and unrealized P&L', () => {
    const v = toHoldingView({
      symbol: 'TCS',
      name: 'TCS',
      sector: 'IT',
      quantity: '10',
      totalCostPaise: '100000',
      lastPricePaise: '12000',
    });
    assert.equal(v.avgCostPaise, '10000');
    assert.equal(v.valuePaise, '120000');
    assert.equal(v.unrealizedPnlPaise, '20000');
    assert.equal(v.value, '1200.00');
    assert.equal(v.unrealizedPnl, '200.00');
    assert.equal(v.avgCost, '100.00');
  });

  it('leaves value and P&L null when there is no price', () => {
    const v = toHoldingView({ symbol: 'X', name: 'X', sector: 'S', quantity: '1', totalCostPaise: '500', lastPricePaise: null });
    assert.equal(v.valuePaise, null);
    assert.equal(v.unrealizedPnl, null);
    assert.equal(v.totalCost, '5.00');
  });

  it('lists only the signed-in user\'s holdings', async () => {
    let asked;
    const controller = createHoldingController({
      holdingRepo: {
        async listByUser(id) {
          asked = id;
          return [{ symbol: 'TCS', name: 'T', sector: 'IT', quantity: '1', totalCostPaise: '100', lastPricePaise: '200' }];
        },
      },
    });
    const res = { status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } };
    await controller.list({ user: { id: '5' } }, res, () => {});
    assert.equal(asked, '5');
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.holdings[0].symbol, 'TCS');
  });

  it('requires holdingRepo', () => {
    assert.throws(() => createHoldingController(), /holdingRepo is required/);
  });
});
