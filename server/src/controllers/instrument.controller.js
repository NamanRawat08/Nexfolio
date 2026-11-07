import { AppError } from '../utils/AppError.js';
import { RANGE_DAYS } from '../repositories/instrument.repository.js';

const SYMBOL_PATTERN = /^[A-Za-z0-9&-]{1,20}$/;
const MAX_SEARCH_LENGTH = 50;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_RANGE = '1Y';

/**
 * Reads a single string query value; arrays and objects (e.g. ?a=1&a=2) are rejected.
 *
 * @param {unknown} value
 * @param {string} name
 * @returns {string|undefined}
 */
function readStringParam(value, name) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new AppError(400, 'INVALID_QUERY', `${name} must be a single value`);
  }
  return value;
}

/**
 * Parses a non-negative integer query value, falling back to a default when absent.
 */
function readIntParam(value, name, { min, max, fallback }) {
  const raw = readStringParam(value, name);
  if (raw === undefined || raw === '') return fallback;
  if (!/^\d+$/.test(raw)) {
    throw new AppError(400, 'INVALID_QUERY', `${name} must be a non-negative integer`);
  }
  const parsed = Number(raw);
  if (parsed < min || parsed > max) {
    throw new AppError(400, 'INVALID_QUERY', `${name} must be between ${min} and ${max}`);
  }
  return parsed;
}

function readSymbol(value) {
  if (typeof value !== 'string' || !SYMBOL_PATTERN.test(value)) {
    throw new AppError(400, 'INVALID_SYMBOL', 'Symbol is invalid');
  }
  return value.toUpperCase();
}

/**
 * Factory creating the market data controller.
 *
 * @param {object} options
 * @param {object} options.instrumentRepo - Instrument repository
 */
export function createInstrumentController({ instrumentRepo } = {}) {
  if (!instrumentRepo) {
    throw new Error('instrumentRepo is required for createInstrumentController');
  }

  return {
    /** GET /instruments?search=&limit=&offset= */
    async list(req, res, next) {
      try {
        const search = readStringParam(req.query.search, 'search')?.trim();
        if (search && search.length > MAX_SEARCH_LENGTH) {
          throw new AppError(
            400,
            'INVALID_QUERY',
            `search must be at most ${MAX_SEARCH_LENGTH} characters`
          );
        }
        const limit = readIntParam(req.query.limit, 'limit', {
          min: 1,
          max: MAX_LIMIT,
          fallback: DEFAULT_LIMIT,
        });
        const offset = readIntParam(req.query.offset, 'offset', {
          min: 0,
          max: 1_000_000,
          fallback: 0,
        });

        const instruments = await instrumentRepo.listInstruments({ search, limit, offset });
        return res.status(200).json({ instruments });
      } catch (err) {
        return next(err);
      }
    },

    /** GET /instruments/:symbol */
    async get(req, res, next) {
      try {
        const symbol = readSymbol(req.params.symbol);
        const instrument = await instrumentRepo.findBySymbol(symbol);
        if (!instrument) {
          throw new AppError(404, 'INSTRUMENT_NOT_FOUND', 'Instrument not found');
        }
        return res.status(200).json({ instrument });
      } catch (err) {
        return next(err);
      }
    },

    /** GET /instruments/:symbol/history?range=1M|3M|6M|1Y */
    async history(req, res, next) {
      try {
        const symbol = readSymbol(req.params.symbol);
        const rawRange = readStringParam(req.query.range, 'range');
        const range = (rawRange || DEFAULT_RANGE).toUpperCase();
        if (!Object.hasOwn(RANGE_DAYS, range)) {
          throw new AppError(
            400,
            'INVALID_RANGE',
            `range must be one of ${Object.keys(RANGE_DAYS).join(', ')}`
          );
        }

        const instrument = await instrumentRepo.findBySymbol(symbol);
        if (!instrument) {
          throw new AppError(404, 'INSTRUMENT_NOT_FOUND', 'Instrument not found');
        }
        const history = await instrumentRepo.getHistory(symbol, range);
        return res.status(200).json({ symbol: instrument.symbol, range, history });
      } catch (err) {
        return next(err);
      }
    },
  };
}

export default createInstrumentController;
