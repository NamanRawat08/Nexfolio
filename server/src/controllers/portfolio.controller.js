import { AppError } from '../utils/AppError.js';
import { formatPaiseToRupees } from '../utils/money.js';

/**
 * Computes the portfolio summary from cash and positions using BigInt paise.
 * Positions without a price are valued at cost and contribute no day movement,
 * so a missing price never shows up as a loss.
 *
 * @param {string|bigint} cashPaise
 * @param {Array<{ quantity: string, totalCostPaise: string, lastPricePaise?: string|null, prevClosePaise?: string|null }>} rows
 */
export function summarizePortfolio(cashPaise, rows) {
  const cash = BigInt(cashPaise);
  let invested = 0n;
  let cost = 0n;
  let dayPnl = 0n;
  let prevInvested = 0n;

  for (const row of rows) {
    const qty = BigInt(row.quantity);
    const rowCost = BigInt(row.totalCostPaise);
    cost += rowCost;
    if (row.lastPricePaise == null) {
      invested += rowCost;
      prevInvested += rowCost;
      continue;
    }
    const value = BigInt(row.lastPricePaise) * qty;
    invested += value;
    if (row.prevClosePaise == null) {
      prevInvested += value;
    } else {
      const prevValue = BigInt(row.prevClosePaise) * qty;
      prevInvested += prevValue;
      dayPnl += value - prevValue;
    }
  }

  const unrealizedPnl = invested - cost;
  const total = cash + invested;
  const dayPnlRatio = prevInvested > 0n ? Number(dayPnl) / Number(prevInvested) : 0;

  return {
    cashPaise: cash.toString(),
    investedValuePaise: invested.toString(),
    costBasisPaise: cost.toString(),
    totalValuePaise: total.toString(),
    unrealizedPnlPaise: unrealizedPnl.toString(),
    dayPnlPaise: dayPnl.toString(),
    dayPnlRatio,
    cash: formatPaiseToRupees(cash),
    investedValue: formatPaiseToRupees(invested),
    costBasis: formatPaiseToRupees(cost),
    totalValue: formatPaiseToRupees(total),
    unrealizedPnl: formatPaiseToRupees(unrealizedPnl),
    dayPnl: formatPaiseToRupees(dayPnl),
    currency: 'INR',
  };
}

/**
 * Factory creating the portfolio controller. Requires auth middleware to have set req.user.
 *
 * @param {object} options
 * @param {object} options.walletRepo
 * @param {object} options.holdingRepo
 */
export function createPortfolioController({ walletRepo, holdingRepo } = {}) {
  if (!walletRepo) throw new Error('walletRepo is required for createPortfolioController');
  if (!holdingRepo) throw new Error('holdingRepo is required for createPortfolioController');

  return {
    /** GET /portfolio/summary: cash, invested value, total value, unrealized and day P&L. */
    async summary(req, res, next) {
      try {
        const wallet = await walletRepo.findByUserId(req.user.id);
        if (!wallet) throw new AppError(404, 'WALLET_NOT_FOUND', 'Wallet not found');
        const rows = await holdingRepo.listByUser(req.user.id);
        return res.status(200).json({ summary: summarizePortfolio(wallet.cashPaise, rows) });
      } catch (err) {
        return next(err);
      }
    },
  };
}

export default createPortfolioController;
