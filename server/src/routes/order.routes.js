import { Router } from 'express';

/**
 * Factory creating the orders router. All routes require an authenticated user.
 *
 * @param {object} options
 * @param {object} options.controller - Order controller
 * @param {import('express').RequestHandler} options.authMiddleware - Auth middleware
 * @param {import('express').RequestHandler[]} [options.placeRateLimit] - Rate limits for placing orders (run after auth)
 * @returns {import('express').Router}
 */
export function createOrderRouter({ controller, authMiddleware, placeRateLimit = [] } = {}) {
  if (!controller) throw new Error('controller is required for createOrderRouter');
  if (!authMiddleware) throw new Error('authMiddleware is required for createOrderRouter');

  const router = Router();
  router.use(authMiddleware);
  router.post('/', ...placeRateLimit, controller.place);
  router.get('/', controller.list);
  router.delete('/:id', controller.cancel);
  return router;
}

export default createOrderRouter;
