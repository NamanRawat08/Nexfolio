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
    assert.throws(() => createPortfolioController({ holdingRepo: {} }), /walletRepo is required/);
    assert.throws(() => createPortfolioController({ walletRepo: {} }), /holdingRepo is required/);
  });

  it('returns the summary for the signed-in user only', async () => {
    const asked = [];
    const controller = createPortfolioController({
      walletRepo: { async findByUserId(id) { asked.push(id); return { cashPaise: '100' }; } },
      holdingRepo: { async listByUser(id) { asked.push(id); return []; } },
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
    });
    await missing.summary({ user: { id: '1' } }, res(), (e) => { error = e; });
    assert.equal(error.code, 'WALLET_NOT_FOUND');

    const boom = new Error('db');
    const failing = createPortfolioController({
      walletRepo: { findByUserId: async () => { throw boom; } },
      holdingRepo: { listByUser: async () => [] },
    });
    await failing.summary({ user: { id: '1' } }, res(), (e) => { error = e; });
    assert.equal(error, boom);
  });
});
