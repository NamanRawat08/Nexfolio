import { Router } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Creates rate limiter middleware for authentication routes.
 *
 * @param {object} [customOptions={}]
 * @returns {import('express').RequestHandler}
 */
export function createAuthRateLimiter(customOptions = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests, please try again later',
        },
      });
    },
    ...customOptions,
  });
}

/**
 * Factory creating authentication router with injected dependencies.
 *
 * @param {object} options
 * @param {object} options.controller - Auth controller
 * @param {import('express').RequestHandler} options.authMiddleware - Auth middleware
 * @param {object} [options.limiterOptions={}] - Optional rate limit overrides
 * @returns {import('express').Router}
 */
export function createAuthRouter({
  controller,
  authMiddleware,
  limiterOptions = {},
} = {}) {
  if (!controller) {
    throw new Error('controller is required for createAuthRouter');
  }
  if (!authMiddleware) {
    throw new Error('authMiddleware is required for createAuthRouter');
  }

  const router = Router();
  const limiter = createAuthRateLimiter(limiterOptions);

  router.post('/register', limiter, controller.register);
  router.post('/login', limiter, controller.login);
  router.post('/logout', authMiddleware, controller.logout);
  router.get('/me', authMiddleware, controller.me);

  return router;
}

export default createAuthRouter;
