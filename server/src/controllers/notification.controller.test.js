import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationController } from './notification.controller.js';
import { createNotificationRouter } from '../routes/notification.routes.js';

describe('notification.controller', () => {
  const res = () => ({
    status(c) { this.statusCode = c; return this; },
    json(d) { this.body = d; return this; },
  });

  it('requires notificationRepo', () => {
    assert.throws(() => createNotificationController(), /notificationRepo is required/);
  });

  it('list returns the signed-in user\'s notifications and unread count', async () => {
    const calls = [];
    const c = createNotificationController({
      notificationRepo: {
        async listByUser(u, o) { calls.push(['list', u, o]); return [{ id: '1' }]; },
        async countUnread(u) { calls.push(['count', u]); return 4; },
      },
    });
    const r = res();
    await c.list({ user: { id: '8' }, query: {} }, r, () => {});
    assert.deepEqual(calls, [['list', '8', { limit: 20 }], ['count', '8']]);
    assert.equal(r.statusCode, 200);
    assert.deepEqual(r.body, { notifications: [{ id: '1' }], unreadCount: 4 });
  });

  it('list validates limit', async () => {
    const c = createNotificationController({ notificationRepo: {} });
    for (const limit of ['0', '51', 'x', '-1', '1.5', ['1', '2']]) {
      let error;
      await c.list({ user: { id: '1' }, query: { limit } }, res(), (e) => { error = e; });
      assert.equal(error.code, 'INVALID_QUERY');
    }
    let used;
    const ok = createNotificationController({ notificationRepo: { listByUser: async (_u, o) => { used = o; return []; }, countUnread: async () => 0 } });
    await ok.list({ user: { id: '1' }, query: { limit: '5' } }, res(), () => {});
    assert.deepEqual(used, { limit: 5 });
  });

  it('readAll marks the signed-in user\'s notifications read', async () => {
    let who;
    const c = createNotificationController({ notificationRepo: { async markAllRead(u) { who = u; return 2; } } });
    const r = res();
    await c.readAll({ user: { id: '8' } }, r, () => {});
    assert.equal(who, '8');
    assert.deepEqual(r.body, { unreadCount: 0 });
  });

  it('forwards repository errors', async () => {
    const boom = new Error('db');
    const c = createNotificationController({ notificationRepo: { async markAllRead() { throw boom; } } });
    let error;
    await c.readAll({ user: { id: '1' } }, res(), (e) => { error = e; });
    assert.equal(error, boom);
  });
});

describe('notification.routes', () => {
  const auth = (req, res, next) => next();

  it('requires controller and authMiddleware', () => {
    assert.throws(() => createNotificationRouter({ authMiddleware: auth }), /controller is required/);
    assert.throws(() => createNotificationRouter({ controller: {} }), /authMiddleware is required/);
  });

  it('applies auth first, then GET / and POST /read-all', () => {
    const router = createNotificationRouter({ controller: { list() {}, readAll() {} }, authMiddleware: auth });
    assert.equal(router.stack[0].handle, auth);
    const routes = router.stack.filter((l) => l.route).map((l) => [l.route.path, Object.keys(l.route.methods)[0]]);
    assert.deepEqual(routes, [['/', 'get'], ['/read-all', 'post']]);
  });
});
