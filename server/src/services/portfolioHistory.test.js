import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTimeline,
  buildRange,
  buildMonthly,
  createPortfolioHistoryService,
  RANGE_POINTS,
} from './portfolioHistory.js';

const dates = ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02'];
const closes = [
  { instrumentId: '1', date: '2026-01-30', closePaise: '1000' },
  { instrumentId: '1', date: '2026-01-31', closePaise: '1100' },
  { instrumentId: '1', date: '2026-02-01', closePaise: '1200' },
  { instrumentId: '1', date: '2026-02-02', closePaise: '1000' },
];

describe('buildTimeline', () => {
  it('returns [] with no market dates', () => {
    assert.deepEqual(buildTimeline({ dates: [], orders: [], closes: [], currentCashPaise: '5' }), []);
  });

  it('is flat at the current cash when the user never traded', () => {
    const t = buildTimeline({ dates, orders: [], closes: [], currentCashPaise: '100000' });
    assert.equal(t.length, 4);
    assert.ok(t.every((p) => p.totalPaise === 100000n && p.investedPaise === 0n));
  });

  it('reconstructs starting cash and values holdings at each day\'s close', () => {
    // Start 100000. Buy 10 @ 1100 on 01-31 (cost 11000) -> cash 89000.
    const orders = [{ instrumentId: '1', side: 'BUY', quantity: '10', totalPaise: '11000', date: '2026-01-31' }];
    const t = buildTimeline({ dates, orders, closes, currentCashPaise: '89000' });
    assert.deepEqual(
      t.map((p) => p.totalPaise),
      [100000n, 100000n, 89000n + 12000n, 89000n + 10000n]
    );
    assert.deepEqual(t.map((p) => p.investedPaise), [0n, 11000n, 12000n, 10000n]);
  });

  it('handles a sell: cash returns, holding leaves', () => {
    // Start 100000: buy 10 @1000 (01-30), sell 4 @1200 (02-01). Cash = 100000-10000+4800 = 94800.
    const orders = [
      { instrumentId: '1', side: 'BUY', quantity: '10', totalPaise: '10000', date: '2026-01-30' },
      { instrumentId: '1', side: 'SELL', quantity: '4', totalPaise: '4800', date: '2026-02-01' },
    ];
    const t = buildTimeline({ dates, orders, closes, currentCashPaise: '94800' });
    assert.equal(t[0].totalPaise, 100000n);
    assert.equal(t[2].investedPaise, 6n * 1200n);
    assert.equal(t[2].totalPaise, 94800n + 7200n);
    assert.equal(t[3].totalPaise, 94800n + 6000n);
  });

  it('applies orders dated after the last price date on the last date, so the final point is the current value', () => {
    // Buy 5 @ 1000 = 5000 placed "later" than the data; cash now 95000.
    const orders = [{ instrumentId: '1', side: 'BUY', quantity: '5', totalPaise: '5000', date: '2026-11-07' }];
    const t = buildTimeline({ dates, orders, closes, currentCashPaise: '95000' });
    assert.equal(t[2].totalPaise, 100000n);
    assert.equal(t[3].investedPaise, 5000n);
    assert.equal(t[3].totalPaise, 100000n);
  });

  it('applies orders older than the window from its first date', () => {
    const orders = [{ instrumentId: '1', side: 'BUY', quantity: '1', totalPaise: '900', date: '2020-01-01' }];
    const t = buildTimeline({ dates, orders, closes, currentCashPaise: '99100' });
    assert.equal(t[0].investedPaise, 1000n);
  });

  it('carries the last known close forward over a missing day', () => {
    const gappy = closes.filter((c) => c.date !== '2026-02-01');
    const orders = [{ instrumentId: '1', side: 'BUY', quantity: '1', totalPaise: '1000', date: '2026-01-30' }];
    const t = buildTimeline({ dates, orders, closes: gappy, currentCashPaise: '99000' });
    assert.equal(t[2].investedPaise, 1100n);
  });

  it('keeps precision beyond Number range', () => {
    const big = 9007199254740993n;
    const t = buildTimeline({ dates: ['2026-01-30'], orders: [], closes: [], currentCashPaise: big });
    assert.equal(t[0].totalPaise, big);
  });
});

describe('buildRange', () => {
  const timeline = [
    { date: '2026-01-01', totalPaise: 100000n, investedPaise: 0n },
    { date: '2026-01-02', totalPaise: 110000n, investedPaise: 0n },
    { date: '2026-01-03', totalPaise: 99000n, investedPaise: 0n },
  ];

  it('shapes values, change and percent', () => {
    const r = buildRange(timeline, '1M');
    assert.equal(r.rangeLabel, '1M');
    assert.equal(r.startValue, '1000.00');
    assert.equal(r.currentValue, '990.00');
    assert.equal(r.changeAmount, '-10.00');
    assert.ok(Math.abs(r.changePercent - -0.01) < 1e-12);
    assert.equal(r.startDate, '2026-01-01');
    assert.equal(r.endDate, '2026-01-03');
    assert.deepEqual(r.points[1], { date: '2026-01-02', value: '1100.00' });
  });

  it('keeps only the last N points for the range', () => {
    const long = Array.from({ length: 400 }, (_, i) => ({ date: `d${i}`, totalPaise: 100n, investedPaise: 0n }));
    assert.equal(buildRange(long, '1M').points.length, RANGE_POINTS['1M']);
    assert.equal(buildRange(long, '1Y').points.length, 366);
  });

  it('returns an empty payload for an empty timeline', () => {
    const r = buildRange([], '6M');
    assert.deepEqual(r.points, []);
    assert.equal(r.startDate, null);
  });
});

describe('buildMonthly', () => {
  const timeline = [
    { date: '2026-01-30', totalPaise: 100000n, investedPaise: 0n },
    { date: '2026-01-31', totalPaise: 101000n, investedPaise: 5000n },
    { date: '2026-02-15', totalPaise: 99000n, investedPaise: 6000n },
    { date: '2026-02-28', totalPaise: 104000n, investedPaise: 7000n },
    { date: '2026-03-02', totalPaise: 103000n, investedPaise: 7500n },
  ];

  it('groups by month using each month\'s last point, measuring returns month over month', () => {
    const m = buildMonthly(timeline);
    assert.equal(m.asOf, '2026-03-02');
    assert.deepEqual(m.months, [
      { month: '2026-01', invested: '50.00', returns: '10.00' }, // from first point 1000.00 -> 1010.00
      { month: '2026-02', invested: '70.00', returns: '30.00' },
      { month: '2026-03', invested: '75.00', returns: '-10.00' },
    ]);
  });

  it('measures the first returned month from the previous month\'s close when older data exists', () => {
    const m = buildMonthly(timeline, 2);
    assert.equal(m.months.length, 2);
    assert.deepEqual(m.months[0], { month: '2026-02', invested: '70.00', returns: '30.00' });
  });

  it('is empty without data', () => {
    assert.deepEqual(buildMonthly([]), { asOf: null, months: [] });
  });
});

describe('createPortfolioHistoryService', () => {
  const repos = (overrides = {}) => ({
    walletRepo: { async findByUserId() { return { cashPaise: '100000' }; } },
    orderRepo: { async listForReplay() { return []; } },
    instrumentRepo: {
      async listTradeDates() { return dates; },
      async getClosesForInstruments() { return []; },
    },
    ...overrides,
  });

  it('requires its dependencies', () => {
    assert.throws(() => createPortfolioHistoryService({ orderRepo: {}, instrumentRepo: {} }), /walletRepo is required/);
    assert.throws(() => createPortfolioHistoryService({ walletRepo: {}, instrumentRepo: {} }), /orderRepo is required/);
    assert.throws(() => createPortfolioHistoryService({ walletRepo: {}, orderRepo: {} }), /instrumentRepo is required/);
  });

  it('returns a range payload and a monthly payload', async () => {
    const svc = createPortfolioHistoryService(repos());
    const range = await svc.getRange('1', '1M');
    assert.equal(range.points.length, 4);
    assert.equal(range.currentValue, '1000.00');
    const monthly = await svc.getMonthly('1');
    assert.equal(monthly.months.length, 2);
  });

  it('asks only for prices of instruments the user traded, from the first market date', async () => {
    let asked;
    const svc = createPortfolioHistoryService(
      repos({
        orderRepo: {
          async listForReplay() {
            return [
              { instrumentId: '7', side: 'BUY', quantity: '1', totalPaise: '1000', date: '2026-01-30' },
              { instrumentId: '7', side: 'SELL', quantity: '1', totalPaise: '1000', date: '2026-01-31' },
            ];
          },
        },
        instrumentRepo: {
          async listTradeDates() { return dates; },
          async getClosesForInstruments(ids, from) { asked = { ids, from }; return closes; },
        },
      })
    );
    await svc.getRange('1', '1M');
    assert.deepEqual(asked, { ids: ['7'], from: '2026-01-30' });
  });

  it('returns null when the wallet is missing and an empty payload with no market data', async () => {
    const missing = createPortfolioHistoryService(repos({ walletRepo: { findByUserId: async () => null } }));
    assert.equal(await missing.getRange('1', '1M'), null);
    assert.equal(await missing.getMonthly('1'), null);

    const noData = createPortfolioHistoryService(
      repos({ instrumentRepo: { listTradeDates: async () => [], getClosesForInstruments: async () => [] } })
    );
    assert.deepEqual((await noData.getRange('1', '1M')).points, []);
  });
});
