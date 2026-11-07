import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatPaiseToRupees } from './money.js';

describe('formatPaiseToRupees', () => {
  it('formats whole and fractional amounts', () => {
    assert.equal(formatPaiseToRupees('100000000'), '1000000.00');
    assert.equal(formatPaiseToRupees(123456), '1234.56');
    assert.equal(formatPaiseToRupees(5), '0.05');
    assert.equal(formatPaiseToRupees(0), '0.00');
  });

  it('handles negatives and values beyond Number precision', () => {
    assert.equal(formatPaiseToRupees(-150), '-1.50');
    assert.equal(formatPaiseToRupees('9007199254740993'), '90071992547409.93');
  });

  it('throws on non-numeric input', () => {
    assert.throws(() => formatPaiseToRupees('abc'));
  });
});
