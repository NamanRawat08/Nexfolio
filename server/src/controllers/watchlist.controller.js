import { AppError } from '../utils/AppError.js';
import { formatPaiseToRupees, rupeesToPaise } from '../utils/money.js';

const SYMBOL_PATTERN = /^[A-Za-z0-9&-]{1,20}$/;
export const MAX_WATCHLIST_ITEMS = 50;

function readSymbol(value) {
  if (typeof value !== 'string' || !SYMBOL_PATTERN.test(value)) {
    throw new AppError(400, 'INVALID_SYMBOL', 'Symbol is invalid');
  }
  return value.toUpperCase();
}

/**
 * Adds the day change (latest close minus the one before) to a watchlist row. Amounts are
 * computed in integer paise; a missing price or previous close leaves the change null.
 */
export function toWatchlistView(row) {
  let change = null;
  let changePercent = null;
  if (row.latestClose !== null && row.previousClose !== null) {
    const latest = rupeesToPaise(row.latestClose);
    const previous = rupeesToPaise(row.previousClose);
    change = formatPaiseToRupees(latest - previous);
    changePercent = previous > 0n ? Number(latest - previous) / Number(previous) : null;
  }
  return { ...row, change, changePercent };
}

/**
 * Factory creating the watchlist controller. Requires auth middleware to have set req.user.
 *
 * @param {object} options
 * @param {object} options.watchlistRepo
 * @param {object} options.instrumentRepo - needs findBySymbol
 */
export function createWatchlistController({ watchlistRepo, instrumentRepo } = {}) {
  if (!watchlistRepo) throw new Error('watchlistRepo is required for createWatchlistController');
  if (!instrumentRepo) throw new Error('instrumentRepo is required for createWatchlistController');

  return {
    /** GET /watchlist: the signed-in user's watched instruments, newest first. */
    async list(req, res, next) {
      try {
        const rows = await watchlistRepo.listByUser(req.user.id);
        return res.status(200).json({ watchlist: rows.map(toWatchlistView) });
      } catch (err) {
        return next(err);
      }
    },

    /** PUT /watchlist/:symbol: add an instrument. Safe to repeat. */
    async add(req, res, next) {
      try {
        const symbol = readSymbol(req.params.symbol);
        const instrument = await instrumentRepo.findBySymbol(symbol);
        if (!instrument) throw new AppError(404, 'INSTRUMENT_NOT_FOUND', 'Instrument not found');

        const status = await watchlistRepo.getStatus(req.user.id, instrument.id);
        if (!status.hasInstrument && status.count >= MAX_WATCHLIST_ITEMS) {
          throw new AppError(
            409,
            'WATCHLIST_FULL',
            `Your watchlist can hold up to ${MAX_WATCHLIST_ITEMS} instruments`
          );
        }
        const added = status.hasInstrument ? false : await watchlistRepo.add(req.user.id, instrument.id);
        return res.status(added ? 201 : 200).json({ symbol: instrument.symbol, watching: true });
      } catch (err) {
        return next(err);
      }
    },

    /** DELETE /watchlist/:symbol: remove an instrument. Safe to repeat. */
    async remove(req, res, next) {
      try {
        const symbol = readSymbol(req.params.symbol);
        await watchlistRepo.removeBySymbol(req.user.id, symbol);
        return res.status(204).send();
      } catch (err) {
        return next(err);
      }
    },
  };
}

export default createWatchlistController;
