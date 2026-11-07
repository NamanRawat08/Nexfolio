import { AppError } from '../utils/AppError.js';
import { formatPaiseToRupees } from '../utils/money.js';
import { RANGE_POINTS } from '../services/portfolioHistory.js';

/**
 * Computes the portfolio summary from cash and positions using BigInt paise.
 * Positions without a price are valued at cost and contribute no day movement,
 * so a missing price never shows up as a loss.
 *
 * @param {string|bigint} cashPaise
 * @param {Array<{ quantity: string, totalCostPaise: string, lastPricePaise?: string|null, prevClosePaise?: string|null }>} rows
 * @param {string|bigint} [reservedCashPaise=0] - Cash held back by pending limit buy orders
 */
export function summarizePortfolio(cashPaise, rows, reservedCashPaise = 0n) {
  const cash = BigInt(cashPaise);
  const reserved = BigInt(reservedCashPaise);
  const available = cash - reserved;
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
    reservedCashPaise: reserved.toString(),
    availableCashPaise: available.toString(),
    investedValuePaise: invested.toString(),
    costBasisPaise: cost.toString(),
    totalValuePaise: total.toString(),
    unrealizedPnlPaise: unrealizedPnl.toString(),
    dayPnlPaise: dayPnl.toString(),
    dayPnlRatio,
    cash: formatPaiseToRupees(cash),
    reservedCash: formatPaiseToRupees(reserved),
    availableCash: formatPaiseToRupees(available),
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
 * @param {object} options.orderRepo - needs reservedForUser
 * @param {object} options.historyService - Portfolio history service
 */
export function createPortfolioController({ walletRepo, holdingRepo, orderRepo, historyService } = {}) {
  if (!walletRepo) throw new Error('walletRepo is required for createPortfolioController');
  if (!holdingRepo) throw new Error('holdingRepo is required for createPortfolioController');
  if (!orderRepo) throw new Error('orderRepo is required for createPortfolioController');
  if (!historyService) throw new Error('historyService is required for createPortfolioController');

  return {
    /** GET /portfolio/summary: cash, invested value, total value, unrealized and day P&L. */
    async summary(req, res, next) {
      try {
        const wallet = await walletRepo.findByUserId(req.user.id);
        if (!wallet) throw new AppError(404, 'WALLET_NOT_FOUND', 'Wallet not found');
        const rows = await holdingRepo.listByUser(req.user.id);
        const reserved = await orderRepo.reservedForUser(req.user.id);
        return res
          .status(200)
          .json({ summary: summarizePortfolio(wallet.cashPaise, rows, reserved.cashPaise) });
      } catch (err) {
        return next(err);
      }
    },

    /** GET /portfolio/history?range=1M|3M|6M|1Y (default 6M): portfolio value over time. */
    async history(req, res, next) {
      try {
        const raw = req.query.range;
        if (raw !== undefined && typeof raw !== 'string') {
          throw new AppError(400, 'INVALID_RANGE', 'range must be a single value');
        }
        const range = (raw || '6M').toUpperCase();
        if (!Object.hasOwn(RANGE_POINTS, range)) {
          throw new AppError(
            400,
            'INVALID_RANGE',
            `range must be one of ${Object.keys(RANGE_POINTS).join(', ')}`
          );
        }
        const history = await historyService.getRange(req.user.id, range);
        if (!history) throw new AppError(404, 'WALLET_NOT_FOUND', 'Wallet not found');
        return res.status(200).json({ history });
      } catch (err) {
        return next(err);
      }
    },

    /** GET /portfolio/performance: holdings value and net return for each of the last 12 months. */
    async performance(req, res, next) {
      try {
        const performance = await historyService.getMonthly(req.user.id);
        if (!performance) throw new AppError(404, 'WALLET_NOT_FOUND', 'Wallet not found');
        return res.status(200).json({ performance });
      } catch (err) {
        return next(err);
      }
    },
  };
}

export default createPortfolioController;
