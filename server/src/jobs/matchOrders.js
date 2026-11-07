import { query, withTransaction, closePool } from '../db/pool.js';
import { createWalletRepository } from '../repositories/wallet.repository.js';
import { createHoldingRepository } from '../repositories/holding.repository.js';
import { createOrderRepository } from '../repositories/order.repository.js';
import { createInstrumentRepository } from '../repositories/instrument.repository.js';
import { createNotificationRepository } from '../repositories/notification.repository.js';
import { createOrderMatcher } from '../services/orderMatcher.js';

/**
 * Fills pending limit orders whose price has been reached by a later daily close.
 * Safe to run any number of times, and while the server is handling orders.
 *
 * @returns {Promise<{ checked: number, filled: number, skipped: number }>}
 */
export async function runOrderMatching() {
  const matcher = createOrderMatcher({
    withTransaction,
    query,
    createRepos: (txQuery) => ({
      wallet: createWalletRepository(txQuery),
      holding: createHoldingRepository(txQuery),
      order: createOrderRepository(txQuery),
      instrument: createInstrumentRepository(txQuery),
      notification: createNotificationRepository(txQuery),
    }),
  });
  return matcher.matchAll();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runOrderMatching()
    .then(({ checked, filled, skipped }) => {
      console.log(`Order matching: ${checked} open, ${filled} filled, ${skipped} skipped.`);
    })
    .catch((err) => {
      console.error('Order matching failed:', err && err.message ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => closePool());
}
