import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listByUser, getStatus, add, removeBySymbol, createWatchlistRepository } from './watchlist.repository.js';

describe('watchlist.repository', () => {
  it('listByUser maps rows and uses a parameterized query without SELECT *', async () => {
    let captured;
    const rows = await listByUser('3', async (sql, params) => {
      captured = { sql, params };
      return { rows: [{ symbol: 'TCS', name: 'T', sector: 'IT', latest_close: '10.00', previous_close: null, latest_trade_date: '2026-11-07' }] };
    });
    assert.deepEqual(rows, [{ symbol: 'TCS', name: 'T', sector: 'IT', latestClose: '10.00', previousClose: null, latestTradeDate: '2026-11-07' }]);
    assert.deepEqual(captured.params, ['3']);
    assert.ok(!/select\s+\*/i.test(captured.sql));
  });

  it('getStatus reads the count and membership', async () => {
    assert.deepEqual(await getStatus('1', '2', async () => ({ rows: [{ count: 4, has_instrument: true }] })), { count: 4, hasInstrument: true });
    assert.deepEqual(await getStatus('1', '2', async () => ({ rows: [{ count: 0, has_instrument: false }] })), { count: 0, hasInstrument: false });
  });

  it('add inserts with ON CONFLICT DO NOTHING and reports whether a row was added', async () => {
    let sql;
    assert.equal(await add('1', '2', async (s) => { sql = s; return { rowCount: 1 }; }), true);
    assert.match(sql, /ON CONFLICT \(user_id, instrument_id\) DO NOTHING/);
    assert.equal(await add('1', '2', async () => ({ rowCount: 0 })), false);
  });

  it('removeBySymbol scopes the delete to the user and reports whether a row was removed', async () => {
    let captured;
    assert.equal(await removeBySymbol('7', 'TCS', async (s, p) => { captured = { s, p }; return { rowCount: 1 }; }), true);
    assert.deepEqual(captured.p, ['7', 'TCS']);
    assert.match(captured.s, /w\.user_id = \$1/);
    assert.equal(await removeBySymbol('7', 'TCS', async () => ({ rowCount: 0 })), false);
  });

  it('factory binds the injected query', async () => {
    const repo = createWatchlistRepository(async () => ({ rows: [] }));
    assert.deepEqual(await repo.listByUser('1'), []);
  });
});
