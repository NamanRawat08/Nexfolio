import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildAllocation } from './allocation.js';

describe('buildAllocation', () => {
  it('groups holdings by sector, adds cash, sorts largest first and computes shares', () => {
    const { total, slices } = buildAllocation({
      cash: '300.00',
      holdings: [
        { sector: 'Technology', value: '400.00', totalCost: '350.00' },
        { sector: 'Technology', value: '100.00', totalCost: '90.00' },
        { sector: 'Energy', value: '200.00', totalCost: '210.00' },
      ],
    });
    assert.equal(total, 1000);
    assert.deepEqual(slices.map((s) => [s.label, s.value, s.share, s.kind]), [
      ['Technology', 500, 0.5, 'sector'],
      ['Cash', 300, 0.3, 'cash'],
      ['Energy', 200, 0.2, 'sector'],
    ]);
  });

  it('values an unpriced holding at cost and skips empty slices', () => {
    const { slices } = buildAllocation({
      cash: '0.00',
      holdings: [{ sector: 'Energy', value: null, totalCost: '50.00' }, { sector: 'X', value: '0.00', totalCost: '0.00' }],
    });
    assert.deepEqual(slices.map((s) => s.label), ['Energy']);
    assert.equal(slices[0].share, 1);
  });

  it('is empty with no cash and no holdings', () => {
    assert.deepEqual(buildAllocation({ cash: '0.00', holdings: [] }), { total: 0, slices: [] });
  });
});
