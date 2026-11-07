import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { reservedForUser, listForReplay, listPending, markCancelled, lockForUser, create } from './order.repository.js';
import { findFirstCrossing } from './instrument.repository.js';

describe('order.repository (limit order support)', () => {
  it('reservedForUser sums reserved cash for BUYs and shares for SELLs per instrument', async () => {
    let captured;
    const result = await reservedForUser('3', async (sql, params) => {
      captured = { sql, params };
      return {
        rows: [
          { side: 'BUY', instrument_id: '1', quantity: '5', reserved_paise: '45000', count: 2 },
          { side: 'BUY', instrument_id: '2', quantity: '1', reserved_paise: '1000', count: 1 },
          { side: 'SELL', instrument_id: '1', quantity: '7', reserved_paise: '70000', count: 1 },
        ],
      };
    });
    assert.equal(result.cashPaise, 46000n);
    assert.equal(result.sharesByInstrument.get('1'), 7n);
    assert.equal(result.sharesByInstrument.has('2'), false);
    assert.equal(result.count, 4);
    assert.deepEqual(captured.params, ['3']);
    assert.match(captured.sql, /status = 'PENDING'/);
  });

  it('reservedForUser is empty with no pending orders', async () => {
    const r = await reservedForUser('3', async () => ({ rows: [] }));
    assert.deepEqual([r.cashPaise, r.count, r.sharesByInstrument.size], [0n, 0, 0]);
  });

  it('listForReplay uses only FILLED orders ordered by execution date', async () => {
    let sql;
    const rows = await listForReplay('1', async (s) => {
      sql = s;
      return { rows: [{ instrument_id: '4', side: 'BUY', quantity: '2', total_paise: '200', date: '2026-11-09' }] };
    });
    assert.match(sql, /status = 'FILLED'/);
    assert.match(sql, /executed_on/);
    assert.deepEqual(rows, [{ instrumentId: '4', side: 'BUY', quantity: '2', totalPaise: '200', date: '2026-11-09' }]);
  });

  it('listPending returns the matcher\'s minimal shape', async () => {
    const rows = await listPending(async () => ({
      rows: [{ id: 9, user_id: 2, instrument_id: 3, symbol: 'TCS', side: 'BUY', quantity: '4', limit_price_paise: '500', placed_price_date: '2026-11-07' }],
    }));
    assert.deepEqual(rows, [{ id: '9', userId: '2', instrumentId: '3', symbol: 'TCS', side: 'BUY', quantity: '4', limitPricePaise: '500', placedPriceDate: '2026-11-07' }]);
  });

  it('lockForUser scopes by user and locks the row; markCancelled only touches pending orders', async () => {
    let lock;
    assert.equal(await lockForUser('5', '1', async (s, p) => { lock = { s, p }; return { rows: [] }; }), null);
    assert.match(lock.s, /user_id = \$2/);
    assert.match(lock.s, /FOR UPDATE/);
    let cancel;
    assert.equal(await markCancelled('5', async (s) => { cancel = s; return { rows: [] }; }), null);
    assert.match(cancel, /status = 'PENDING'/);
  });

  it('create maps a pending limit order with null fill fields', async () => {
    const order = await create(
      { userId: '1', instrumentId: '2', side: 'BUY', quantity: 3n, orderType: 'LIMIT', status: 'PENDING', limitPricePaise: 9000n, placedPriceDate: '2026-11-07' },
      async (sql, params) => {
        assert.match(sql, /INSERT INTO orders/);
        assert.equal(params[6], '9000');
        assert.equal(params[7], null);
        return {
          rows: [{ id: 1, symbol: 'TCS', name: 'T', side: 'BUY', order_type: 'LIMIT', status: 'PENDING', quantity: '3', limit_price_paise: '9000', price_paise: null, total_paise: null, realized_pnl_paise: null, created_at: 'c', executed_on: null }],
        };
      }
    );
    assert.equal(order.status, 'PENDING');
    assert.equal(order.limitPricePaise, '9000');
    assert.equal(order.pricePaise, null);
    assert.equal(order.executedOn, null);
  });
});

describe('instrument.repository findFirstCrossing', () => {
  it('uses <= for BUY and >= for SELL with parameterized values', async () => {
    const calls = [];
    const q = async (sql, params) => { calls.push({ sql, params }); return { rows: [{ date: '2026-11-09', close_paise: '8800' }] }; };
    assert.deepEqual(await findFirstCrossing('1', 'BUY', 9000n, '2026-11-07', q), { date: '2026-11-09', closePaise: '8800' });
    await findFirstCrossing('1', 'SELL', '12000', null, q);
    assert.match(calls[0].sql, /<= \$2::bigint/);
    assert.match(calls[1].sql, />= \$2::bigint/);
    assert.deepEqual(calls[0].params, ['1', '9000', '2026-11-07']);
    assert.deepEqual(calls[1].params, ['1', '12000', null]);
  });

  it('returns null when nothing crosses and rejects an invalid side', async () => {
    assert.equal(await findFirstCrossing('1', 'BUY', 1n, null, async () => ({ rows: [] })), null);
    await assert.rejects(findFirstCrossing('1', 'HOLD', 1n, null, async () => ({ rows: [] })), /side must be BUY or SELL/);
  });
});
