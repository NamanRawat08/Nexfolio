import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPortfolioController, summarizePortfolio } from './portfolio.controller.js';

describe('summarizePortfolio', () => {
  it('totals cash, invested value, cost, unrealized and day P&L in paise', () => {
    const s = summarizePortfolio('1000000', [
      { quantity: '10', totalCostPaise: '100000', lastPricePaise: '12000', prevClosePaise: '11000' },
      { quantity: '5', totalCostPaise: '50000', lastPricePaise: '9000', prevClosePaise: '10000' },
    ]);
    assert.equal(s.investedValuePaise, String(120000 + 45000));
    assert.equal(s.costBasisPaise, '150000');
    assert.equal(s.totalValuePaise, String(1000000 + 165000));
    assert.equal(s.unrealizedPnlPaise, '15000');
    assert.equal(s.dayPnlPaise, String(10000 - 5000));
    assert.ok(Math.abs(s.dayPnlRatio - 5000 / (110000 + 50000)) < 1e-12);
    assert.equal(s.cash, '10000.00');
    assert.equal(s.dayPnl, '50.00');
    assert.equal(s.currency, 'INR');
  });

  it('is all zeros with no positions', () => {
    const s = summarizePortfolio('500', []);
    assert.equal(s.investedValuePaise, '0');
    assert.equal(s.totalValuePaise, '500');
    assert.equal(s.dayPnlPaise, '0');
    assert.equal(s.dayPnlRatio, 0);
  });

  it('values unpriced positions at cost with no day movement', () => {
    const s = summarizePortfolio('0', [
      { quantity: '2', totalCostPaise: '700', lastPricePaise: null, prevClosePaise: null },
    ]);
    assert.equal(s.investedValuePaise, '700');
    assert.equal(s.unrealizedPnlPaise, '0');
    assert.equal(s.dayPnlPaise, '0');
  });

  it('treats a missing previous close as no day movement', () => {
    const s = summarizePortfolio('0', [
      { quantity: '2', totalCostPaise: '700', lastPricePaise: '400', prevClosePaise: null },
    ]);
    assert.equal(s.dayPnlPaise, '0');
    assert.equal(s.unrealizedPnlPaise, '100');
  });

  it('keeps precision for very large balances', () => {
    const s = summarizePortfolio('9007199254740993', []);
    assert.equal(s.cashPaise, '9007199254740993');
    assert.equal(s.cash, '90071992547409.93');
  });
});

describe('portfolio.controller', () => {
  const res = () => ({
    status(c) { this.statusCode = c; return this; },
    json(d) { this.body = d; return this; },
  });

  it('requires dependencies', () => {
    assert.throws(() => createPortfolioController({ holdingRepo: {}, historyService: {} }), /walletRepo is required/);
    assert.throws(() => createPortfolioController({ walletRepo: {}, historyService: {} }), /holdingRepo is required/);
    assert.throws(() => createPortfolioController({ walletRepo: {}, holdingRepo: {} }), /historyService is required/);
  });

  it('returns the summary for the signed-in user only', async () => {
    const asked = [];
    const controller = createPortfolioController({
      walletRepo: { async findByUserId(id) { asked.push(id); return { cashPaise: '100' }; } },
      holdingRepo: { async listByUser(id) { asked.push(id); return []; } },
      historyService: {},
    });
    const r = res();
    await controller.summary({ user: { id: '3' } }, r, () => {});
    assert.deepEqual(asked, ['3', '3']);
    assert.equal(r.statusCode, 200);
    assert.equal(r.body.summary.totalValuePaise, '100');
  });

  it('404s when the wallet is missing and forwards other errors', async () => {
    let error;
    const missing = createPortfolioController({
      walletRepo: { findByUserId: async () => null },
      holdingRepo: { listByUser: async () => [] },
      historyService: {},
    });
    await missing.summary({ user: { id: '1' } }, res(), (e) => { error = e; });
    assert.equal(error.code, 'WALLET_NOT_FOUND');

    const boom = new Error('db');
    const failing = createPortfolioController({
      walletRepo: { findByUserId: async () => { throw boom; } },
      holdingRepo: { listByUser: async () => [] },
      historyService: {},
    });
    await failing.summary({ user: { id: '1' } }, res(), (e) => { error = e; });
    assert.equal(error, boom);
  });
});

describe('portfolio.controller history and performance', () => {
  const res = () => ({
    status(c) { this.statusCode = c; return this; },
    json(d) { this.body = d; return this; },
  });
  const make = (historyService) =>
    createPortfolioController({ walletRepo: {}, holdingRepo: {}, historyService });

  it('history defaults to 6M, normalizes case and uses req.user', async () => {
    const calls = [];
    const c = make({ async getRange(u, r) { calls.push([u, r]); return { rangeLabel: r, points: [] }; } });
    const r1 = res();
    await c.history({ user: { id: '4' }, query: {} }, r1, () => {});
    await c.history({ user: { id: '4' }, query: { range: '1y' } }, res(), () => {});
    assert.deepEqual(calls, [['4', '6M'], ['4', '1Y']]);
    assert.equal(r1.statusCode, 200);
    assert.equal(r1.body.history.rangeLabel, '6M');
  });

  for (const range of ['5Y', 'constructor', ['1M', '3M']]) {
    it(`history rejects range ${JSON.stringify(range)} with 400`, async () => {
      let error;
      await make({}).history({ user: { id: '1' }, query: { range } }, res(), (e) => { error = e; });
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, 'INVALID_RANGE');
    });
  }

  it('history and performance 404 when the service returns null', async () => {
    const c = make({ getRange: async () => null, getMonthly: async () => null });
    let e1; let e2;
    await c.history({ user: { id: '1' }, query: {} }, res(), (e) => { e1 = e; });
    await c.performance({ user: { id: '1' } }, res(), (e) => { e2 = e; });
    assert.equal(e1.code, 'WALLET_NOT_FOUND');
    assert.equal(e2.code, 'WALLET_NOT_FOUND');
  });

  it('performance returns the monthly payload', async () => {
    const c = make({ getMonthly: async (u) => ({ asOf: 'x', months: [u] }) });
    const r = res();
    await c.performance({ user: { id: '9' } }, r, () => {});
    assert.equal(r.statusCode, 200);
    assert.deepEqual(r.body.performance.months, ['9']);
  });
});
