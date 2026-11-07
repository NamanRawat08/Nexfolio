import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { create, listByUser, countUnread, markAllRead, createNotificationRepository } from './notification.repository.js';

describe('notification.repository', () => {
  it('create ignores a duplicate (order, kind) and reports whether a row was stored', async () => {
    let captured;
    assert.equal(await create({ userId: '1', orderId: '2', kind: 'ORDER_FILLED', title: 't', body: 'b' }, async (sql, params) => {
      captured = { sql, params };
      return { rowCount: 1 };
    }), true);
    assert.match(captured.sql, /ON CONFLICT \(order_id, kind\) DO NOTHING/);
    assert.deepEqual(captured.params, ['1', '2', 'ORDER_FILLED', 't', 'b']);
    assert.equal(await create({ userId: '1', orderId: '2', kind: 'ORDER_FILLED', title: 't', body: 'b' }, async () => ({ rowCount: 0 })), false);
  });

  it('listByUser maps rows, caps the limit and scopes by user', async () => {
    let captured;
    const rows = await listByUser('4', { limit: 999 }, async (sql, params) => {
      captured = { sql, params };
      return { rows: [{ id: 1, order_id: 9, kind: 'ORDER_FILLED', title: 'T', body: 'B', created_at: 'c', read_at: null }] };
    });
    assert.deepEqual(rows, [{ id: '1', kind: 'ORDER_FILLED', title: 'T', body: 'B', orderId: '9', createdAt: 'c', readAt: null }]);
    assert.deepEqual(captured.params, ['4', 50]);
    assert.ok(!/select\s+\*/i.test(captured.sql));
  });

  it('countUnread and markAllRead only touch the user\'s unread rows', async () => {
    let c; let m;
    assert.equal(await countUnread('4', async (sql, params) => { c = { sql, params }; return { rows: [{ count: 3 }] }; }), 3);
    assert.match(c.sql, /read_at IS NULL/);
    assert.equal(await markAllRead('4', async (sql, params) => { m = { sql, params }; return { rowCount: 2 }; }), 2);
    assert.match(m.sql, /user_id = \$1 AND read_at IS NULL/);
    assert.deepEqual(m.params, ['4']);
  });

  it('factory binds the injected query', async () => {
    const repo = createNotificationRepository(async () => ({ rows: [{ count: 0 }], rowCount: 0 }));
    assert.equal(await repo.countUnread('1'), 0);
  });
});
