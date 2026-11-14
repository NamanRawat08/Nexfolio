import { Router } from 'express';
import healthRoutes from './health.routes.js';
import { createAuthRouter } from './auth.routes.js';
import { createInstrumentRouter } from './instrument.routes.js';
import { createWalletRouter } from './wallet.routes.js';
import { createRateLimiters } from '../rateLimit/createRateLimiters.js';
import {
  createRateLimitMiddleware,
  keyByBodyField,
  keyByIp,
  keyByUser,
} from '../middleware/rateLimit.middleware.js';
import { createOrderRouter } from './order.routes.js';
import { createHoldingRouter } from './holding.routes.js';
import { createPortfolioRouter } from './portfolio.routes.js';
import { createWatchlistRouter } from './watchlist.routes.js';
import { createNotificationRouter } from './notification.routes.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { createAuthService } from '../services/auth.service.js';
import * as tokenService from '../services/token.service.js';
import * as passwordService from '../services/password.service.js';
import { createInstrumentController } from '../controllers/instrument.controller.js';
import { createInstrumentRepository } from '../repositories/instrument.repository.js';
import { createWalletController } from '../controllers/wallet.controller.js';
import { createWalletRepository } from '../repositories/wallet.repository.js';
import { createOrderController } from '../controllers/order.controller.js';
import { createHoldingController } from '../controllers/holding.controller.js';
import { createPortfolioController } from '../controllers/portfolio.controller.js';
import { createWatchlistController } from '../controllers/watchlist.controller.js';
import { createWatchlistRepository } from '../repositories/watchlist.repository.js';
import { createNotificationController } from '../controllers/notification.controller.js';
import { createNotificationRepository } from '../repositories/notification.repository.js';
import { createOrderRepository } from '../repositories/order.repository.js';
import { createHoldingRepository } from '../repositories/holding.repository.js';
import { createOrderService } from '../services/order.service.js';
import { createPortfolioHistoryService } from '../services/portfolioHistory.js';
import { createUserRepository } from '../repositories/user.repository.js';
import { query as poolQuery, withTransaction as poolWithTransaction } from '../db/pool.js';
import { getConfig } from '../config/index.js';

/**
 * Factory creating API router with all route modules and composed dependencies.
 * Composition root for real service, repository, and controller wiring.
 *
 * @param {object} [options={}]
 * @param {object} [options.config]
 * @param {Function} [options.query]
 * @param {object} [options.rateLimiters] - Limiters by policy name (see rateLimit/createRateLimiters.js); built from the config by default
 * @returns {import('express').Router}
 */
export function createApiRouter({
  config,
  query = poolQuery,
  withTransaction = poolWithTransaction,
  rateLimiters,
} = {}) {
  const currentConfig = config ?? getConfig();
  const apiRouter = Router();

  // Rate limiting: Redis-backed when REDIS_URL is set (with an in-memory fallback), else in memory.
  const limiters = rateLimiters ?? createRateLimiters({ config: currentConfig });
  const limit = (name, keyFn) => createRateLimitMiddleware({ limiter: limiters[name], keyFn });

  // Health check routes
  apiRouter.use(healthRoutes);

  // Auth composition: repository, services, middleware, controller, and router
  const userRepo = createUserRepository(query);
  const authService = createAuthService({
    userRepo,
    passwordService,
    tokenService,
    config: currentConfig,
  });
  const authMiddleware = createAuthMiddleware({
    tokenService,
    userRepo,
    config: currentConfig,
  });
  const controller = createAuthController({
    authService,
    config: currentConfig,
  });
  const authRouter = createAuthRouter({
    controller,
    authMiddleware,
    rateLimits: {
      register: [limit('register', keyByIp)],
      login: [limit('loginIp', keyByIp), limit('loginAccount', keyByBodyField('identifier'))],
      changePassword: [limit('changePassword', keyByUser)],
    },
  });

  apiRouter.use('/auth', authRouter);

  // Market data composition: repository, controller, and router (authenticated)
  const instrumentRepo = createInstrumentRepository(query);
  const instrumentController = createInstrumentController({ instrumentRepo });
  apiRouter.use(
    '/instruments',
    createInstrumentRouter({ controller: instrumentController, authMiddleware })
  );

  // Wallet composition: repository, controller, and router (authenticated)
  const walletRepo = createWalletRepository(query);
  const walletController = createWalletController({ walletRepo });
  apiRouter.use('/wallet', createWalletRouter({ controller: walletController, authMiddleware }));

  // Trading composition: orders (atomic buy/sell) and holdings
  const orderService = createOrderService({
    withTransaction,
    createRepos: (txQuery) => ({
      wallet: createWalletRepository(txQuery),
      holding: createHoldingRepository(txQuery),
      order: createOrderRepository(txQuery),
      instrument: createInstrumentRepository(txQuery),
    }),
  });
  const orderController = createOrderController({
    orderService,
    orderRepo: createOrderRepository(query),
  });
  apiRouter.use(
    '/orders',
    createOrderRouter({
      controller: orderController,
      authMiddleware,
      placeRateLimit: [limit('orders', keyByUser)],
    })
  );

  const holdingController = createHoldingController({ holdingRepo: createHoldingRepository(query) });
  apiRouter.use('/holdings', createHoldingRouter({ controller: holdingController, authMiddleware }));

  const portfolioController = createPortfolioController({
    walletRepo,
    holdingRepo: createHoldingRepository(query),
    orderRepo: createOrderRepository(query),
    historyService: createPortfolioHistoryService({
      walletRepo,
      orderRepo: createOrderRepository(query),
      instrumentRepo,
    }),
  });
  apiRouter.use(
    '/portfolio',
    createPortfolioRouter({ controller: portfolioController, authMiddleware })
  );

  const watchlistController = createWatchlistController({
    watchlistRepo: createWatchlistRepository(query),
    instrumentRepo,
  });
  apiRouter.use(
    '/watchlist',
    createWatchlistRouter({ controller: watchlistController, authMiddleware })
  );

  const notificationController = createNotificationController({
    notificationRepo: createNotificationRepository(query),
  });
  apiRouter.use(
    '/notifications',
    createNotificationRouter({ controller: notificationController, authMiddleware })
  );

  return apiRouter;
}
