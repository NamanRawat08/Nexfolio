import { Router } from 'express';

/**
 * Factory creating authentication router with injected dependencies.
 *
 * `rateLimits` holds the rate-limit middleware for each limited route, as arrays run in order:
 * `register`, `login` and `changePassword`. They are required so a route can never be left
 * unprotected by accident (pass an empty array only in tests that do not care).
 *
 * @param {object} options
 * @param {object} options.controller - Auth controller
 * @param {import('express').RequestHandler} options.authMiddleware - Auth middleware
 * @param {{ register: import('express').RequestHandler[], login: import('express').RequestHandler[], changePassword: import('express').RequestHandler[] }} options.rateLimits
 * @returns {import('express').Router}
 */
export function createAuthRouter({ controller, authMiddleware, rateLimits } = {}) {
  if (!controller) {
    throw new Error('controller is required for createAuthRouter');
  }
  if (!authMiddleware) {
    throw new Error('authMiddleware is required for createAuthRouter');
  }
  for (const name of ['register', 'login', 'changePassword']) {
    if (!Array.isArray(rateLimits?.[name])) {
      throw new Error(`rateLimits.${name} is required for createAuthRouter`);
    }
  }

  const router = Router();

  router.post('/register', ...rateLimits.register, controller.register);
  router.post('/login', ...rateLimits.login, controller.login);
  router.post('/change-password', authMiddleware, ...rateLimits.changePassword, controller.changePassword);
  router.post('/logout', authMiddleware, controller.logout);
  router.get('/me', authMiddleware, controller.me);

  return router;
}

export default createAuthRouter;
