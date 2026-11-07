import { AppError } from '../utils/AppError.js';
import { formatPaiseToRupees } from '../utils/money.js';

const MAX_LIMIT = 100;

const rupees = (paise) => (paise === null || paise === undefined ? null : formatPaiseToRupees(paise));

function withRupees(order) {
  return {
    ...order,
    limitPrice: rupees(order.limitPricePaise),
    price: rupees(order.pricePaise),
    total: rupees(order.totalPaise),
    realizedPnl: rupees(order.realizedPnlPaise),
  };
}

const STATUSES = ['PENDING', 'FILLED', 'CANCELLED'];

function readIntParam(value, name, { min, max, fallback }) {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new AppError(400, 'INVALID_QUERY', `${name} must be a non-negative integer`);
  }
  const parsed = Number(value);
  if (parsed < min || parsed > max) {
    throw new AppError(400, 'INVALID_QUERY', `${name} must be between ${min} and ${max}`);
  }
  return parsed;
}

/**
 * Factory creating the orders controller. Requires auth middleware to have set req.user.
 *
 * @param {object} options
 * @param {object} options.orderService - Order service
 * @param {object} options.orderRepo - Order repository (for listing)
 */
export function createOrderController({ orderService, orderRepo } = {}) {
  if (!orderService) throw new Error('orderService is required for createOrderController');
  if (!orderRepo) throw new Error('orderRepo is required for createOrderController');

  return {
    /**
     * POST /orders { symbol, side, quantity, orderType?, limitPrice? }
     * Places a simulated market or limit order (201). A limit order that cannot fill yet is
     * returned with status PENDING.
     */
    async place(req, res, next) {
      try {
        const body = req.body;
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Order data must be an object');
        }
        const { symbol, side, quantity, orderType, limitPrice } = body;
        const { order, cashPaise } = await orderService.placeOrder(req.user.id, {
          symbol,
          side,
          quantity,
          orderType,
          limitPrice,
        });
        return res.status(201).json({
          order: withRupees(order),
          wallet: { cashPaise, cash: formatPaiseToRupees(cashPaise), currency: 'INR' },
        });
      } catch (err) {
        return next(err);
      }
    },

    /** GET /orders?limit=&offset=&status=: the signed-in user's orders, newest first. */
    async list(req, res, next) {
      try {
        const limit = readIntParam(req.query.limit, 'limit', { min: 1, max: MAX_LIMIT, fallback: 50 });
        const offset = readIntParam(req.query.offset, 'offset', { min: 0, max: 1_000_000, fallback: 0 });
        const rawStatus = req.query.status;
        if (rawStatus !== undefined && (typeof rawStatus !== 'string' || !STATUSES.includes(rawStatus.toUpperCase()))) {
          throw new AppError(400, 'INVALID_QUERY', `status must be one of ${STATUSES.join(', ')}`);
        }
        const status = rawStatus === undefined ? null : rawStatus.toUpperCase();
        const orders = await orderRepo.listByUser(req.user.id, { limit, offset, status });
        return res.status(200).json({ orders: orders.map(withRupees) });
      } catch (err) {
        return next(err);
      }
    },

    /** DELETE /orders/:id: cancels one of the signed-in user's open limit orders. */
    async cancel(req, res, next) {
      try {
        const order = await orderService.cancelOrder(req.user.id, req.params.id);
        return res.status(200).json({ order: withRupees(order) });
      } catch (err) {
        return next(err);
      }
    },
  };
}

export default createOrderController;
