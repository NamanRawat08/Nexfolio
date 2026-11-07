import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createOrderMatcher } from './orderMatcher.js';

function setup({ pending, wallets, holdings = {}, crossing = {}, stillPending = () => true }) {
  const state = {
    wallets: Object.fromEntries(Object.entries(wallets).map(([k, v]) => [k, BigInt(v)])),
    holdings: Object.fromEntries(Object.entries(holdings).map(([k, v]) => [k, { ...v }])),
    filled: [],
    notifications: [],
    crossingCalls: [],
  };
  const repos = {
    wallet: {
      async lockByUserId(userId) {
        return userId in state.wallets ? { cashPaise: state.wallets[userId].toString() } : null;
      },
      async setCash(userId, v) {
        state.wallets[userId] = BigInt(v);
      },
    },
    holding: {
      async findForUpdate(userId, instrumentId) {
        const h = state.holdings[`${userId}:${instrumentId}`];
        return h ? { ...h } : null;
      },
      async upsert(userId, instrumentId, pos) {
        state.holdings[`${userId}:${instrumentId}`] = { ...pos };
      },
      async remove(userId, instrumentId) {
        delete state.holdings[`${userId}:${instrumentId}`];
      },
    },
    order: {
      async listPending() {
        return pending;
      },
      async lockPending(id) {
        return stillPending(id);
      },
      async markFilled(id, fill) {
        state.filled.push({ id, ...fill });
      },
    },
    notification: {
      async create(n) {
        state.notifications.push(n);
        return true;
      },
    },
    instrument: {
      async findFirstCrossing(instrumentId, side, limit, after) {
        state.crossingCalls.push({ instrumentId, side, limit, after });
        return crossing[instrumentId] ?? null;
      },
    },
  };
  let txCount = 0;
  const matcher = createOrderMatcher({
    withTransaction: async (fn) => {
      txCount += 1;
      const snap = { wallets: { ...state.wallets }, holdings: JSON.parse(JSON.stringify(state.holdings, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))) };
      try {
        return await fn(() => {});
      } catch (e) {
        state.wallets = snap.wallets;
        throw e;
      }
    },
    createRepos: () => repos,
    query: () => {},
  });
  return { matcher, state, txCount: () => txCount };
}

const buy = (id, over = {}) => ({ id, userId: 'u1', instrumentId: 'i1', symbol: 'TCS', side: 'BUY', quantity: '10', limitPricePaise: '9000', placedPriceDate: '2026-11-07', ...over });

describe('createOrderMatcher', () => {
  it('requires its dependencies', () => {
    assert.throws(() => createOrderMatcher({ createRepos() {}, query() {} }), /withTransaction is required/);
    assert.throws(() => createOrderMatcher({ withTransaction() {}, query() {} }), /createRepos is required/);
    assert.throws(() => createOrderMatcher({ withTransaction() {}, createRepos() {} }), /query is required/);
  });

  it('fills a BUY at the crossing close, on that date, and debits cash', async () => {
    const { matcher, state } = setup({
      pending: [buy('1')],
      wallets: { u1: 1000000 },
      crossing: { i1: { date: '2026-11-09', closePaise: '8800' } },
    });
    const result = await matcher.matchAll();
    assert.deepEqual(result, { checked: 1, filled: 1, skipped: 0 });
    assert.equal(state.wallets.u1, 1000000n - 88000n);
    assert.deepEqual(state.holdings['u1:i1'], { quantity: 10n, totalCostPaise: 88000n });
    assert.deepEqual(state.filled[0], { id: '1', pricePaise: 8800n, totalPaise: 88000n, realizedPnlPaise: null, executedOn: '2026-11-09' });
    assert.deepEqual(state.crossingCalls[0], { instrumentId: 'i1', side: 'BUY', limit: '9000', after: '2026-11-07' });
  });

  it('fills a SELL at the crossing close and records realized P&L', async () => {
    const { matcher, state } = setup({
      pending: [buy('2', { side: 'SELL', quantity: '4', limitPricePaise: '12000' })],
      wallets: { u1: 0 },
      holdings: { 'u1:i1': { quantity: 10n, totalCostPaise: 80000n } },
      crossing: { i1: { date: '2026-11-10', closePaise: '12500' } },
    });
    const result = await matcher.matchAll();
    assert.equal(result.filled, 1);
    assert.equal(state.wallets.u1, 50000n);
    assert.deepEqual(state.holdings['u1:i1'], { quantity: 6n, totalCostPaise: 48000n });
    assert.equal(state.filled[0].realizedPnlPaise, 50000n - 32000n);
  });

  it('leaves an order pending when no later close reaches the limit', async () => {
    const { matcher, state } = setup({ pending: [buy('3')], wallets: { u1: 1000000 }, crossing: {} });
    assert.deepEqual(await matcher.matchAll(), { checked: 1, filled: 0, skipped: 0 });
    assert.equal(state.wallets.u1, 1000000n);
    assert.equal(state.filled.length, 0);
  });

  it('skips orders that were cancelled or filled while waiting for the lock', async () => {
    const { matcher, state } = setup({
      pending: [buy('4')],
      wallets: { u1: 1000000 },
      crossing: { i1: { date: '2026-11-09', closePaise: '8800' } },
      stillPending: () => false,
    });
    assert.deepEqual(await matcher.matchAll(), { checked: 1, filled: 0, skipped: 0 });
    assert.equal(state.filled.length, 0);
  });

  it('never overdraws: if cash or shares are missing the order is skipped, not filled', async () => {
    const poor = setup({ pending: [buy('5')], wallets: { u1: 100 }, crossing: { i1: { date: '2026-11-09', closePaise: '8800' } } });
    assert.deepEqual(await poor.matcher.matchAll(), { checked: 1, filled: 0, skipped: 1 });
    assert.equal(poor.state.wallets.u1, 100n);

    const noShares = setup({
      pending: [buy('6', { side: 'SELL', limitPricePaise: '100' })],
      wallets: { u1: 0 },
      crossing: { i1: { date: '2026-11-09', closePaise: '500' } },
    });
    assert.deepEqual(await noShares.matcher.matchAll(), { checked: 1, filled: 0, skipped: 1 });
  });

  it('processes each order in its own transaction, oldest first, so one user\'s fills see the previous one', async () => {
    const { matcher, state, txCount } = setup({
      pending: [buy('7', { quantity: '5' }), buy('8', { quantity: '5' })],
      wallets: { u1: 1000000 },
      crossing: { i1: { date: '2026-11-09', closePaise: '8800' } },
    });
    const result = await matcher.matchAll();
    assert.equal(result.filled, 2);
    assert.equal(txCount(), 2);
    assert.deepEqual(state.holdings['u1:i1'], { quantity: 10n, totalCostPaise: 88000n });
    assert.deepEqual(state.filled.map((f) => f.id), ['7', '8']);
  });

  it('skips a user whose wallet is missing', async () => {
    const { matcher } = setup({ pending: [buy('9', { userId: 'ghost' })], wallets: {} });
    assert.deepEqual(await matcher.matchAll(), { checked: 1, filled: 0, skipped: 1 });
  });

  it('does nothing with no pending orders', async () => {
    const { matcher, txCount } = setup({ pending: [], wallets: {} });
    assert.deepEqual(await matcher.matchAll(), { checked: 0, filled: 0, skipped: 0 });
    assert.equal(txCount(), 0);
  });
});
