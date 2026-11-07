import { Router } from 'express';

/**
 * Factory creating the notifications router. All routes require an authenticated user.
 *
 * @param {object} options
 * @param {object} options.controller - Notification controller
 * @param {import('express').RequestHandler} options.authMiddleware - Auth middleware
 * @returns {import('express').Router}
 */
export function createNotificationRouter({ controller, authMiddleware } = {}) {
  if (!controller) throw new Error('controller is required for createNotificationRouter');
  if (!authMiddleware) throw new Error('authMiddleware is required for createNotificationRouter');

  const router = Router();
  router.use(authMiddleware);
  router.get('/', controller.list);
  router.post('/read-all', controller.readAll);
  return router;
}

export default createNotificationRouter;
