import { AppError } from '../utils/AppError.js';
import { rupeesToPaise } from '../utils/money.js';
import { applyFill } from './tradeExecution.js';

const SYMBOL_PATTERN = /^[A-Za-z0-9&-]{1,20}$/;
const ORDER_ID_PATTERN = /^\d{1,18}$/;
export const MAX_ORDER_QUANTITY = 1_000_000;
export const MAX_LIMIT_PRICE_PAISE = 999_999_999n; // ₹99,99,999.99
export const MAX_PENDING_ORDERS = 20;

function validateOrder({ symbol, side, quantity, orderType, limitPrice } = {}) {
  if (typeof symbol !== 'string' || !SYMBOL_PATTERN.test(symbol)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Symbol is invalid');
  }
  const normalizedSide = typeof side === 'string' ? side.toUpperCase() : '';
  if (normalizedSide !== 'BUY' && normalizedSide !== 'SELL') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Side must be BUY or SELL');
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ORDER_QUANTITY) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      `Quantity must be a whole number between 1 and ${MAX_ORDER_QUANTITY}`
    );
  }

  const normalizedType = orderType === undefined ? 'MARKET' : typeof orderType === 'string' ? orderType.toUpperCase() : '';
  if (normalizedType !== 'MARKET' && normalizedType !== 'LIMIT') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Order type must be MARKET or LIMIT');
  }

  let limitPricePaise = null;
  if (normalizedType === 'LIMIT') {
    if (typeof limitPrice !== 'string') {
      throw new AppError(400, 'VALIDATION_ERROR', 'Limit price is required for a limit order');
    }
    try {
      limitPricePaise = rupeesToPaise(limitPrice);
    } catch {
      throw new AppError(400, 'VALIDATION_ERROR', 'Limit price must be an amount in rupees with at most 2 decimals');
    }
    if (limitPricePaise < 1n || limitPricePaise > MAX_LIMIT_PRICE_PAISE) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Limit price is out of range');
    }
  } else if (limitPrice !== undefined && limitPrice !== null) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Limit price is only allowed for a limit order');
  }

  return {
    symbol: symbol.toUpperCase(),
    side: normalizedSide,
    quantity: BigInt(quantity),
    orderType: normalizedType,
    limitPricePaise,
  };
}

/**
 * Factory creating the order service.
 *
 * - Market orders fill immediately at the instrument's latest close.
 * - Limit orders fill immediately at the latest close when it already satisfies the limit
 *   (at or below it for a BUY, at or above it for a SELL); otherwise they wait as PENDING and
 *   are filled by the order matcher when a later daily close reaches the limit.
 * - A pending BUY reserves limit price × quantity of cash and a pending SELL reserves its
 *   shares, so cash and shares can never be promised twice.
 *
 * Each action runs in one transaction that locks the user's wallet first, so a user's orders
 * are applied one at a time and cash, holdings and the order log can never disagree.
 *
 * @param {object} options
 * @param {Function} options.withTransaction - (fn(query)) => Promise, runs fn in a transaction
 * @param {Function} options.createRepos - (query) => { wallet, holding, order, instrument }
 */
export function createOrderService({ withTransaction, createRepos } = {}) {
  if (!withTransaction) throw new Error('withTransaction is required for createOrderService');
  if (!createRepos) throw new Error('createRepos is required for createOrderService');

  return {
    /**
     * Places a market or limit order.
     *
     * @param {string|number} userId
     * @param {{ symbol: string, side: string, quantity: number, orderType?: string, limitPrice?: string }} input
     * @returns {Promise<{ order: object, cashPaise: string }>} cashPaise is the user's total cash after the call
     */
    async placeOrder(userId, input) {
      const { symbol, side, quantity, orderType, limitPricePaise } = validateOrder(input);

      return withTransaction(async (query) => {
        const repos = createRepos(query);

        const wallet = await repos.wallet.lockByUserId(userId);
        if (!wallet) throw new AppError(404, 'WALLET_NOT_FOUND', 'Wallet not found');

        const instrument = await repos.instrument.findBySymbol(symbol);
        if (!instrument) throw new AppError(404, 'INSTRUMENT_NOT_FOUND', 'Instrument not found');
        if (instrument.latestClose === null) {
          throw new AppError(409, 'NO_PRICE_AVAILABLE', 'No price available for this instrument');
        }

        const pricePaise = rupeesToPaise(instrument.latestClose);
        const cash = BigInt(wallet.cashPaise);
        const holding = await repos.holding.findForUpdate(userId, instrument.id);
        const reserved = await repos.order.reservedForUser(userId);

        const availableCash = cash - reserved.cashPaise;
        const availableShares =
          (holding?.quantity ?? 0n) - (reserved.sharesByInstrument.get(String(instrument.id)) ?? 0n);

        const marketable =
          orderType === 'MARKET' ||
          (side === 'BUY' ? pricePaise <= limitPricePaise : pricePaise >= limitPricePaise);

        if (marketable) {
          const totalPaise = pricePaise * quantity;
          if (side === 'BUY' && totalPaise > availableCash) {
            throw new AppError(422, 'INSUFFICIENT_FUNDS', 'Not enough cash for this order');
          }
          if (side === 'SELL' && quantity > availableShares) {
            throw new AppError(422, 'INSUFFICIENT_HOLDINGS', 'Not enough shares to sell');
          }

          const fill = await applyFill({
            repos,
            userId,
            instrumentId: instrument.id,
            side,
            quantity,
            pricePaise,
            cash,
            holding,
          });
          const order = await repos.order.create({
            userId,
            instrumentId: instrument.id,
            side,
            quantity,
            orderType,
            status: 'FILLED',
            limitPricePaise,
            pricePaise,
            totalPaise: fill.totalPaise,
            realizedPnlPaise: fill.realizedPnlPaise,
          });
          return { order, cashPaise: fill.newCash.toString() };
        }

        // Not fillable yet: park it as a pending limit order and reserve what it needs.
        if (reserved.count >= MAX_PENDING_ORDERS) {
          throw new AppError(
            409,
            'TOO_MANY_PENDING_ORDERS',
            `You can have up to ${MAX_PENDING_ORDERS} open orders at once`
          );
        }
        if (side === 'BUY' && limitPricePaise * quantity > availableCash) {
          throw new AppError(422, 'INSUFFICIENT_FUNDS', 'Not enough cash to reserve for this order');
        }
        if (side === 'SELL' && quantity > availableShares) {
          throw new AppError(422, 'INSUFFICIENT_HOLDINGS', 'Not enough shares to sell');
        }

        const order = await repos.order.create({
          userId,
          instrumentId: instrument.id,
          side,
          quantity,
          orderType,
          status: 'PENDING',
          limitPricePaise,
          placedPriceDate: instrument.latestTradeDate,
        });
        return { order, cashPaise: cash.toString() };
      });
    },

    /**
     * Cancels one of the user's pending limit orders, releasing what it reserved.
     *
     * @param {string|number} userId
     * @param {string} orderId
     * @returns {Promise<object>} the cancelled order
     */
    async cancelOrder(userId, orderId) {
      if (typeof orderId !== 'string' || !ORDER_ID_PATTERN.test(orderId)) {
        throw new AppError(400, 'INVALID_ORDER_ID', 'Order id is invalid');
      }

      return withTransaction(async (query) => {
        const repos = createRepos(query);

        // Lock order matches the matcher: wallet first, then the order.
        const wallet = await repos.wallet.lockByUserId(userId);
        if (!wallet) throw new AppError(404, 'WALLET_NOT_FOUND', 'Wallet not found');

        const existing = await repos.order.lockForUser(orderId, userId);
        if (!existing) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
        if (existing.status !== 'PENDING') {
          throw new AppError(409, 'ORDER_NOT_PENDING', 'Only open orders can be cancelled');
        }

        const cancelled = await repos.order.markCancelled(orderId);
        if (!cancelled) throw new AppError(409, 'ORDER_NOT_PENDING', 'Only open orders can be cancelled');
        return cancelled;
      });
    },
  };
}

export default createOrderService;
