import { AppError } from '../utils/AppError.js';
import { formatPaiseToRupees } from '../utils/money.js';

const CURRENCY = 'INR';

/**
 * Factory creating the wallet controller. Requires auth middleware to have set req.user.
 *
 * @param {object} options
 * @param {object} options.walletRepo - Wallet repository
 */
export function createWalletController({ walletRepo } = {}) {
  if (!walletRepo) {
    throw new Error('walletRepo is required for createWalletController');
  }

  return {
    /** GET /wallet: the signed-in user's simulated cash balance. */
    async get(req, res, next) {
      try {
        const wallet = await walletRepo.findByUserId(req.user.id);
        if (!wallet) {
          throw new AppError(404, 'WALLET_NOT_FOUND', 'Wallet not found');
        }
        return res.status(200).json({
          wallet: {
            cashPaise: wallet.cashPaise,
            cash: formatPaiseToRupees(wallet.cashPaise),
            currency: CURRENCY,
          },
        });
      } catch (err) {
        return next(err);
      }
    },
  };
}

export default createWalletController;
