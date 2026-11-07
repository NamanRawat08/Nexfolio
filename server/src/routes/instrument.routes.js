import { Router } from 'express';

/**
 * Factory creating the market data router with injected dependencies.
 * All routes require an authenticated user.
 *
 * @param {object} options
 * @param {object} options.controller - Instrument controller
 * @param {import('express').RequestHandler} options.authMiddleware - Auth middleware
 * @returns {import('express').Router}
 */
export function createInstrumentRouter({ controller, authMiddleware } = {}) {
  if (!controller) {
    throw new Error('controller is required for createInstrumentRouter');
  }
  if (!authMiddleware) {
    throw new Error('authMiddleware is required for createInstrumentRouter');
  }

  const router = Router();
  router.use(authMiddleware);

  router.get('/', controller.list);
  router.get('/:symbol/history', controller.history);
  router.get('/:symbol', controller.get);

  return router;
}

export default createInstrumentRouter;
