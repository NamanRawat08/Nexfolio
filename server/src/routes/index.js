import { Router } from 'express';
import healthRoutes from './health.routes.js';
import { createAuthRouter } from './auth.routes.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import { createAuthService } from '../services/auth.service.js';
import * as tokenService from '../services/token.service.js';
import * as passwordService from '../services/password.service.js';
import { createUserRepository } from '../repositories/user.repository.js';
import { query as poolQuery } from '../db/pool.js';
import { getConfig } from '../config/index.js';

/**
 * Factory creating API router with all route modules and composed dependencies.
 * Composition root for real service, repository, and controller wiring.
 *
 * @param {object} [options={}]
 * @param {object} [options.config]
 * @param {Function} [options.query]
 * @param {object} [options.limiterOptions]
 * @returns {import('express').Router}
 */
export function createApiRouter({ config, query = poolQuery, limiterOptions } = {}) {
  const currentConfig = config ?? getConfig();
  const apiRouter = Router();

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
    limiterOptions,
  });

  apiRouter.use('/auth', authRouter);

  return apiRouter;
}

let apiRouterInstance = null;

function getApiRouter() {
  if (!apiRouterInstance) {
    apiRouterInstance = createApiRouter();
  }
  return apiRouterInstance;
}

// Lazy router proxy to avoid invoking getConfig() or database pool at import time
const defaultApiRouter = function (req, res, next) {
  return getApiRouter()(req, res, next);
};

const proxyApiRouter = new Proxy(defaultApiRouter, {
  get(target, prop) {
    if (prop in target) {
      return target[prop];
    }
    const instance = getApiRouter();
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export default proxyApiRouter;
