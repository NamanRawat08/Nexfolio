import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { instrumentsData } from './instruments.data.js';
import { generateHistory, formatPaiseToRupees } from './priceGenerator.js';

describe('instruments.data', () => {
  it('contains exactly 18 entries', () => {
    assert.equal(instrumentsData.length, 18);
  });

  it('all symbols match ^[A-Z0-9&-]{1,20}$ and are unique case-insensitively', () => {
    const symbolRegex = /^[A-Z0-9&-]{1,20}$/;
    const seen = new Set();

    for (const inst of instrumentsData) {
      assert.match(inst.symbol, symbolRegex, `Symbol ${inst.symbol} does not match regex`);
      assert.equal(typeof inst.name, 'string');
      assert.equal(inst.name.length >= 1 && inst.name.length <= 100, true);
      assert.equal(typeof inst.sector, 'string');
      assert.notEqual(inst.sector.trim(), '');

      const upper = inst.symbol.toUpperCase();
      assert.equal(seen.has(upper), false, `Duplicate symbol ${inst.symbol}`);
      seen.add(upper);
    }
  });

  it('every basePricePaise is an integer between 20000 and 99999999', () => {
    for (const inst of instrumentsData) {
      assert.equal(Number.isInteger(inst.basePricePaise), true);
      assert.equal(inst.basePricePaise >= 20000, true);
      assert.equal(inst.basePricePaise < 99999999, true);
    }
  });
});

describe('priceGenerator', () => {
  it('is completely deterministic: identical parameters yield identical series', () => {
    const series1 = generateHistory({ basePricePaise: 250000, seed: 'RELIANCE', days: 366, endDate: '2026-10-26' });
    const series2 = generateHistory({ basePricePaise: 250000, seed: 'RELIANCE', days: 366, endDate: '2026-10-26' });

    assert.deepEqual(series1, series2);
  });

  it('generates exactly 366 consecutive calendar days ending at endDate', () => {
    const endDate = '2026-10-26';
    const days = 366;
    const series = generateHistory({ basePricePaise: 100000, seed: 'INFY', days, endDate });

    assert.equal(series.length, days);
    assert.equal(series[series.length - 1].date, endDate);

    // Verify consecutive calendar days in UTC
    for (let i = 1; i < series.length; i++) {
      const prevDate = new Date(`${series[i - 1].date}T00:00:00.000Z`);
      const currDate = new Date(`${series[i].date}T00:00:00.000Z`);
      const diffMs = currDate.getTime() - prevDate.getTime();
      assert.equal(diffMs, 86400000, `Dates not consecutive between ${series[i - 1].date} and ${series[i].date}`);
    }
  });

  it('all prices are integers >= 100 paise and daily moves are bounded within +/- 3 percent', () => {
    const series = generateHistory({ basePricePaise: 50000, seed: 'TCS', days: 366 });

    for (let i = 0; i < series.length; i++) {
      const price = series[i].closePaise;
      assert.equal(Number.isInteger(price), true);
      assert.equal(price >= 100, true);

      if (i > 0) {
        const prevPrice = series[i - 1].closePaise;
        const moveRatio = Math.abs(price - prevPrice) / prevPrice;
        // Verify daily move <= 3.00% (allowing small floating point comparison epsilon)
        assert.equal(moveRatio <= 0.0300001, true, `Daily move exceeded 3% at index ${i}: prev=${prevPrice}, curr=${price}, ratio=${moveRatio}`);
      }
    }
  });

  it('different symbols produce different price series', () => {
    const seriesA = generateHistory({ basePricePaise: 200000, seed: 'RELIANCE' });
    const seriesB = generateHistory({ basePricePaise: 200000, seed: 'TCS' });

    assert.notDeepEqual(seriesA, seriesB);
  });
});

describe('formatPaiseToRupees helper', () => {
  it('formats integer paise to currency strings without floating point conversion', () => {
    assert.equal(formatPaiseToRupees(0), '0.00');
    assert.equal(formatPaiseToRupees(5), '0.05');
    assert.equal(formatPaiseToRupees(100), '1.00');
    assert.equal(formatPaiseToRupees(123456), '1234.56');
  });
});
