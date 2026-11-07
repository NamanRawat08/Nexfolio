import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderMatcher } from './orderMatcher.js';
import { formatShortDate } from '../utils/dates.js';

function run({ side = 'BUY', crossing = { date: '2026-11-03', closePaise: '317694' }, failNotification = false } = {}) {
  const notifications = [];
  const state = { cash: 10000000n, filled: 0 };
  const repos = {
    wallet: {
      async lockByUserId() { return { cashPaise: state.cash.toString() }; },
      async setCash(_u, v) { state.cash = BigInt(v); },
    },
    holding: {
      async findForUpdate() { return side === 'SELL' ? { quantity: 10n, totalCostPaise: 100000n } : null; },
      async upsert() {},
      async remove() {},
    },
    order: {
      async listPending() {
        return [{ id: '10', userId: 'u1', instrumentId: 'i1', symbol: 'TCS', side, quantity: '1', limitPricePaise: '320000', placedPriceDate: '2026-11-01' }];
      },
      async lockPending() { return true; },
      async markFilled() { state.filled += 1; },
    },
    instrument: { async findFirstCrossing() { return crossing; } },
    notification: {
      async create(n) {
        if (failNotification) throw new Error('notification failed');
        notifications.push(n);
        return true;
      },
    },
  };
  const matcher = createOrderMatcher({
    withTransaction: async (fn) => {
      const snapshot = { cash: state.cash, filled: state.filled };
      try { return await fn(() => {}); } catch (e) { Object.assign(state, snapshot); throw e; }
    },
    createRepos: () => repos,
    query: () => {},
  });
  return { matcher, notifications, state };
}

describe('order matcher notifications', () => {
  it('creates one ORDER_FILLED notification in plain language when a BUY fills', async () => {
    const { matcher, notifications } = run();
    await matcher.matchAll();
    assert.equal(notifications.length, 1);
    const n = notifications[0];
    assert.equal(n.userId, 'u1');
    assert.equal(n.orderId, '10');
    assert.equal(n.kind, 'ORDER_FILLED');
    assert.equal(n.title, 'Limit order filled');
    assert.equal(n.body, 'Your order to buy 1 TCS was filled at ₹3,176.94 (your limit was ₹3,200.00) on 3 Nov 2026.');
  });

  it('describes a SELL fill', async () => {
    const { matcher, notifications } = run({ side: 'SELL', crossing: { date: '2026-11-04', closePaise: '400000' } });
    await matcher.matchAll();
    assert.match(notifications[0].body, /^Your order to sell 1 TCS was filled at ₹4,000\.00/);
  });

  it('creates no notification when nothing fills', async () => {
    const { matcher, notifications } = run({ crossing: null });
    await matcher.matchAll();
    assert.equal(notifications.length, 0);
  });

  it('rolls the fill back if the notification cannot be saved (everything or nothing)', async () => {
    const { matcher, state } = run({ failNotification: true });
    await assert.rejects(matcher.matchAll(), /notification failed/);
    assert.equal(state.filled, 0);
    assert.equal(state.cash, 10000000n);
  });
});

describe('formatShortDate', () => {
  it('formats dates and passes through anything else', () => {
    assert.equal(formatShortDate('2026-11-03'), '3 Nov 2026');
    assert.equal(formatShortDate('2026-12-25'), '25 Dec 2026');
    assert.equal(formatShortDate('2026-13-01'), '2026-13-01');
    assert.equal(formatShortDate('soon'), 'soon');
  });
});
