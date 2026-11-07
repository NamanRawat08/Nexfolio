import { Router } from 'express';

/**
 * Factory creating the watchlist router. All routes require an authenticated user.
 *
 * @param {object} options
 * @param {object} options.controller - Watchlist controller
 * @param {import('express').RequestHandler} options.authMiddleware - Auth middleware
 * @returns {import('express').Router}
 */
export function createWatchlistRouter({ controller, authMiddleware } = {}) {
  if (!controller) throw new Error('controller is required for createWatchlistRouter');
  if (!authMiddleware) throw new Error('authMiddleware is required for createWatchlistRouter');

  const router = Router();
  router.use(authMiddleware);
  router.get('/', controller.list);
  router.put('/:symbol', controller.add);
  router.delete('/:symbol', controller.remove);
  return router;
}

export default createWatchlistRouter;
