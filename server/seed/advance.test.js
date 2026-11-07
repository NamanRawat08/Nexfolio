import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { instrumentsData } from './instruments.data.js';
import { generateHistory, daysInclusive, MARKET_START_DATE } from './priceGenerator.js';
import { planPriceRows, advancePrices, todayUtc } from './advance.js';
import { insertPriceRows } from './priceRows.js';

const reliance = instrumentsData.find((i) => i.symbol === 'RELIANCE');

describe('daysInclusive and MARKET_START_DATE', () => {
  it('counts calendar days inclusively', () => {
    assert.equal(daysInclusive('2026-01-01', '2026-01-01'), 1);
    assert.equal(daysInclusive('2026-01-30', '2026-02-02'), 4);
    assert.equal(daysInclusive(MARKET_START_DATE, '2026-10-26'), 366);
  });
});

describe('extending a series', () => {
  it('reproduces the original 366-day seed exactly and only adds later days', () => {
    const original = generateHistory({ basePricePaise: reliance.basePricePaise, seed: 'RELIANCE' });
    const days = daysInclusive(MARKET_START_DATE, '2026-11-08');
    const extended = generateHistory({
      basePricePaise: reliance.basePricePaise,
      seed: 'RELIANCE',
      days,
      endDate: '2026-11-08',
    });
    assert.equal(extended.length, 366 + 13);
    assert.deepEqual(extended.slice(0, 366), original);
    assert.equal(extended[366].date, '2026-10-27');
    assert.equal(extended.at(-1).date, '2026-11-08');
  });
});

describe('planPriceRows', () => {
  it('returns only dates after each instrument\'s latest date, matching the deterministic series', () => {
    const rows = planPriceRows({
      instruments: [{ id: '1', symbol: 'RELIANCE', latestDate: '2026-10-26' }],
      endDate: '2026-10-29',
    });
    assert.deepEqual(rows.map((r) => r.date), ['2026-10-27', '2026-10-28', '2026-10-29']);
    const full = generateHistory({
      basePricePaise: reliance.basePricePaise,
      seed: 'RELIANCE',
      days: daysInclusive(MARKET_START_DATE, '2026-10-29'),
      endDate: '2026-10-29',
    });
    assert.deepEqual(rows.map((r) => r.closePaise), full.slice(-3).map((p) => p.closePaise));
    assert.ok(rows.every((r) => r.instrumentId === '1'));
  });

  it('adds nothing when already up to date', () => {
    const rows = planPriceRows({
      instruments: [{ id: '1', symbol: 'RELIANCE', latestDate: '2026-10-29' }],
      endDate: '2026-10-29',
    });
    assert.deepEqual(rows, []);
  });

  it('generates the whole range for an instrument with no history, and is case-insensitive', () => {
    const rows = planPriceRows({
      instruments: [{ id: '2', symbol: 'tcs', latestDate: null }],
      endDate: '2025-10-28',
    });
    assert.deepEqual(rows.map((r) => r.date), ['2025-10-26', '2025-10-27', '2025-10-28']);
  });

  it('skips instruments that are not in the seed data', () => {
    const rows = planPriceRows({
      instruments: [{ id: '9', symbol: 'UNKNOWN', latestDate: null }],
      endDate: '2026-01-01',
    });
    assert.deepEqual(rows, []);
  });

  it('returns nothing for an end date before the market start', () => {
    assert.deepEqual(
      planPriceRows({ instruments: [{ id: '1', symbol: 'RELIANCE', latestDate: null }], endDate: '2025-01-01' }),
      []
    );
  });
});

describe('insertPriceRows', () => {
  it('batches at 500 rows, uses ON CONFLICT DO NOTHING and formats paise as rupees', async () => {
    const calls = [];
    const query = async (text, params) => {
      calls.push({ text, params });
      return { rowCount: params.length / 3 };
    };
    const rows = Array.from({ length: 1001 }, (_, i) => ({ instrumentId: '1', date: `d${i}`, closePaise: 123456 }));
    const inserted = await insertPriceRows(query, rows);
    assert.equal(inserted, 1001);
    assert.equal(calls.length, 3);
    assert.match(calls[0].text, /ON CONFLICT \(instrument_id, trade_date\) DO NOTHING/);
    assert.equal(calls[0].params[2], '1234.56');
    assert.equal(calls[2].params.length, 3);
  });

  it('does nothing for no rows', async () => {
    let called = false;
    assert.equal(await insertPriceRows(async () => { called = true; return { rowCount: 0 }; }, []), 0);
    assert.equal(called, false);
  });
});

describe('advancePrices', () => {
  function fakeTransaction({ instruments }) {
    const inserts = [];
    const withTransaction = async (fn) =>
      fn(async (text, params) => {
        if (/FROM instruments/.test(text)) {
          return {
            rows: instruments.map((i) => ({ id: i.id, symbol: i.symbol, latest_date: i.latestDate })),
          };
        }
        inserts.push(params);
        return { rowCount: params.length / 3 };
      });
    return { withTransaction, inserts };
  }

  it('inserts missing days in one transaction and reports the count', async () => {
    const { withTransaction, inserts } = fakeTransaction({
      instruments: [
        { id: '1', symbol: 'RELIANCE', latestDate: '2026-10-26' },
        { id: '2', symbol: 'TCS', latestDate: '2026-10-27' },
      ],
    });
    const result = await advancePrices({ endDate: '2026-10-28', withTransaction });
    assert.deepEqual(result, { endDate: '2026-10-28', inserted: 2 + 1 });
    assert.equal(inserts.length, 1);
  });

  it('is a no-op when everything is current', async () => {
    const { withTransaction, inserts } = fakeTransaction({
      instruments: [{ id: '1', symbol: 'RELIANCE', latestDate: '2026-10-28' }],
    });
    assert.deepEqual(await advancePrices({ endDate: '2026-10-28', withTransaction }), {
      endDate: '2026-10-28',
      inserted: 0,
    });
    assert.equal(inserts.length, 0);
  });

  it('refuses to generate prices for future dates', async () => {
    await assert.rejects(
      advancePrices({ endDate: '2999-01-01', withTransaction: async () => assert.fail('should not run') }),
      /cannot be in the future/
    );
  });
});

describe('todayUtc', () => {
  it('formats the UTC calendar date', () => {
    assert.equal(todayUtc(new Date('2026-11-08T23:30:00-05:00')), '2026-11-09');
  });
});
