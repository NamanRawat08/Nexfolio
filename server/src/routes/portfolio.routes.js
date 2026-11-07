import { Router } from 'express';

/**
 * Factory creating the portfolio router. All routes require an authenticated user.
 *
 * @param {object} options
 * @param {object} options.controller - Portfolio controller
 * @param {import('express').RequestHandler} options.authMiddleware - Auth middleware
 * @returns {import('express').Router}
 */
export function createPortfolioRouter({ controller, authMiddleware } = {}) {
  if (!controller) throw new Error('controller is required for createPortfolioRouter');
  if (!authMiddleware) throw new Error('authMiddleware is required for createPortfolioRouter');

  const router = Router();
  router.use(authMiddleware);
  router.get('/summary', controller.summary);
  router.get('/history', controller.history);
  router.get('/performance', controller.performance);
  return router;
}

export default createPortfolioRouter;
