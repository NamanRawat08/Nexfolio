import { applyFill } from './tradeExecution.js';

/**
 * Factory creating the pending-order matcher. For every pending limit order it looks for the
 * first daily close after the order was placed that satisfies the limit (at or below it for a
 * BUY, at or above it for a SELL) and fills the order at that close, on that date.
 *
 * Each order is processed in its own transaction that locks the user's wallet and then the
 * order (the same order the order service uses), so matching can run while users trade.
 * Reservations made when the order was placed guarantee the cash or shares are there; if that
 * ever fails the order is left pending and counted as skipped.
 *
 * @param {object} options
 * @param {Function} options.withTransaction
 * @param {Function} options.createRepos - (query) => { wallet, holding, order, instrument }
 * @param {Function} options.query - Plain (non-transaction) query used to list pending orders
 */
export function createOrderMatcher({ withTransaction, createRepos, query } = {}) {
  if (!withTransaction) throw new Error('withTransaction is required for createOrderMatcher');
  if (!createRepos) throw new Error('createRepos is required for createOrderMatcher');
  if (!query) throw new Error('query is required for createOrderMatcher');

  return {
    /**
     * @returns {Promise<{ checked: number, filled: number, skipped: number }>}
     */
    async matchAll() {
      const pending = await createRepos(query).order.listPending();
      let filled = 0;
      let skipped = 0;

      for (const p of pending) {
        const result = await withTransaction(async (txQuery) => {
          const repos = createRepos(txQuery);

          const wallet = await repos.wallet.lockByUserId(p.userId);
          if (!wallet) return 'skipped';
          if (!(await repos.order.lockPending(p.id))) return 'none'; // cancelled or filled meanwhile

          const hit = await repos.instrument.findFirstCrossing(
            p.instrumentId,
            p.side,
            p.limitPricePaise,
            p.placedPriceDate
          );
          if (!hit) return 'none';

          const quantity = BigInt(p.quantity);
          const pricePaise = BigInt(hit.closePaise);
          const cash = BigInt(wallet.cashPaise);
          const holding = await repos.holding.findForUpdate(p.userId, p.instrumentId);

          if (p.side === 'BUY' ? pricePaise * quantity > cash : !holding || holding.quantity < quantity) {
            return 'skipped';
          }

          const fill = await applyFill({
            repos,
            userId: p.userId,
            instrumentId: p.instrumentId,
            side: p.side,
            quantity,
            pricePaise,
            cash,
            holding,
          });
          await repos.order.markFilled(p.id, {
            pricePaise,
            totalPaise: fill.totalPaise,
            realizedPnlPaise: fill.realizedPnlPaise,
            executedOn: hit.date,
          });
          return 'filled';
        });

        if (result === 'filled') filled += 1;
        else if (result === 'skipped') skipped += 1;
      }

      return { checked: pending.length, filled, skipped };
    },
  };
}

export default createOrderMatcher;
