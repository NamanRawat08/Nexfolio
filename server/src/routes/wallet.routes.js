import { Router } from 'express';

/**
 * Factory creating the wallet router. All routes require an authenticated user.
 *
 * @param {object} options
 * @param {object} options.controller - Wallet controller
 * @param {import('express').RequestHandler} options.authMiddleware - Auth middleware
 * @returns {import('express').Router}
 */
export function createWalletRouter({ controller, authMiddleware } = {}) {
  if (!controller) {
    throw new Error('controller is required for createWalletRouter');
  }
  if (!authMiddleware) {
    throw new Error('authMiddleware is required for createWalletRouter');
  }

  const router = Router();
  router.use(authMiddleware);
  router.get('/', controller.get);
  return router;
}

export default createWalletRouter;
