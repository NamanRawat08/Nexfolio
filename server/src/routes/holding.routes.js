import { Router } from 'express';

/**
 * Factory creating the holdings router. All routes require an authenticated user.
 *
 * @param {object} options
 * @param {object} options.controller - Holding controller
 * @param {import('express').RequestHandler} options.authMiddleware - Auth middleware
 * @returns {import('express').Router}
 */
export function createHoldingRouter({ controller, authMiddleware } = {}) {
  if (!controller) throw new Error('controller is required for createHoldingRouter');
  if (!authMiddleware) throw new Error('authMiddleware is required for createHoldingRouter');

  const router = Router();
  router.use(authMiddleware);
  router.get('/', controller.list);
  return router;
}

export default createHoldingRouter;
