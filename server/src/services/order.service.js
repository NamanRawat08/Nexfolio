import { AppError } from '../utils/AppError.js';
import { rupeesToPaise } from '../utils/money.js';

const SYMBOL_PATTERN = /^[A-Za-z0-9&-]{1,20}$/;
export const MAX_ORDER_QUANTITY = 1_000_000;

function validateOrder({ symbol, side, quantity } = {}) {
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
  return { symbol: symbol.toUpperCase(), side: normalizedSide, quantity: BigInt(quantity) };
}

/**
 * Factory creating the order service. Orders are simulated market orders that fill
 * immediately at the instrument's latest close. Each order runs in one transaction
 * that locks the user's wallet first, so a user's orders are applied one at a time
 * and cash, holdings and the order log can never disagree.
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
     * Places and immediately fills a market order.
     *
     * @param {string|number} userId
     * @param {{ symbol: string, side: string, quantity: number }} input
     * @returns {Promise<{ order: object, cashPaise: string }>}
     */
    async placeOrder(userId, input) {
      const { symbol, side, quantity } = validateOrder(input);

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
        const totalPaise = pricePaise * quantity;
        const cash = BigInt(wallet.cashPaise);
        const holding = await repos.holding.findForUpdate(userId, instrument.id);

        let newCash;
        let realizedPnlPaise = null;

        if (side === 'BUY') {
          if (totalPaise > cash) {
            throw new AppError(422, 'INSUFFICIENT_FUNDS', 'Not enough cash for this order');
          }
          newCash = cash - totalPaise;
          await repos.holding.upsert(userId, instrument.id, {
            quantity: (holding?.quantity ?? 0n) + quantity,
            totalCostPaise: (holding?.totalCostPaise ?? 0n) + totalPaise,
          });
        } else {
          if (!holding || holding.quantity < quantity) {
            throw new AppError(422, 'INSUFFICIENT_HOLDINGS', 'Not enough shares to sell');
          }
          // Cost basis leaves the position pro rata (rounded down); the rest stays on the remaining shares.
          const costRemoved =
            quantity === holding.quantity ? holding.totalCostPaise : (holding.totalCostPaise * quantity) / holding.quantity;
          realizedPnlPaise = totalPaise - costRemoved;
          newCash = cash + totalPaise;
          if (quantity === holding.quantity) {
            await repos.holding.remove(userId, instrument.id);
          } else {
            await repos.holding.upsert(userId, instrument.id, {
              quantity: holding.quantity - quantity,
              totalCostPaise: holding.totalCostPaise - costRemoved,
            });
          }
        }

        await repos.wallet.setCash(userId, newCash);
        const order = await repos.order.create({
          userId,
          instrumentId: instrument.id,
          side,
          quantity,
          pricePaise,
          totalPaise,
          realizedPnlPaise,
        });

        return { order, cashPaise: newCash.toString() };
      });
    },
  };
}

export default createOrderService;
