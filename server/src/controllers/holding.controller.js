import { formatPaiseToRupees } from '../utils/money.js';

/**
 * Derives value and unrealized P&L from a stored position and the latest price.
 * Missing prices leave value and P&L null rather than guessing.
 */
export function toHoldingView(row) {
  const quantity = BigInt(row.quantity);
  const totalCost = BigInt(row.totalCostPaise);
  const hasPrice = row.lastPricePaise !== null && row.lastPricePaise !== undefined;
  const lastPrice = hasPrice ? BigInt(row.lastPricePaise) : null;
  const value = hasPrice ? lastPrice * quantity : null;
  const pnl = hasPrice ? value - totalCost : null;
  const fmt = (v) => (v === null ? null : formatPaiseToRupees(v));

  return {
    symbol: row.symbol,
    name: row.name,
    sector: row.sector,
    quantity: quantity.toString(),
    avgCostPaise: (totalCost / quantity).toString(),
    totalCostPaise: totalCost.toString(),
    lastPricePaise: hasPrice ? lastPrice.toString() : null,
    valuePaise: hasPrice ? value.toString() : null,
    unrealizedPnlPaise: hasPrice ? pnl.toString() : null,
    avgCost: formatPaiseToRupees(totalCost / quantity),
    totalCost: formatPaiseToRupees(totalCost),
    lastPrice: fmt(lastPrice),
    value: fmt(value),
    unrealizedPnl: fmt(pnl),
  };
}

/**
 * Factory creating the holdings controller. Requires auth middleware to have set req.user.
 *
 * @param {object} options
 * @param {object} options.holdingRepo - Holding repository
 */
export function createHoldingController({ holdingRepo } = {}) {
  if (!holdingRepo) throw new Error('holdingRepo is required for createHoldingController');

  return {
    /** GET /holdings: the signed-in user's current positions. */
    async list(req, res, next) {
      try {
        const rows = await holdingRepo.listByUser(req.user.id);
        return res.status(200).json({ holdings: rows.map(toHoldingView) });
      } catch (err) {
        return next(err);
      }
    },
  };
}

export default createHoldingController;
