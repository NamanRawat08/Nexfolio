import { AppError } from '../utils/AppError.js';
import * as defaultTokenService from '../services/token.service.js';
import * as defaultUserRepo from '../repositories/user.repository.js';

/**
 * Creates an authentication middleware with injected dependencies.
 * Verifies the `nexfolio_token` HTTP-only cookie using the pinned token service.
 *
 * @param {object} [options={}]
 * @param {object} [options.tokenService=defaultTokenService]
 * @param {object} [options.userRepo=defaultUserRepo]
 * @param {object} [options.config={}]
 * @returns {import('express').RequestHandler}
 */
export function createAuthMiddleware({
  tokenService = defaultTokenService,
  userRepo = defaultUserRepo,
  config = {},
} = {}) {
  return async function authMiddleware(req, res, next) {
    try {
      const token = req.cookies?.nexfolio_token;
      if (!token || typeof token !== 'string') {
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      }

      let decoded;
      try {
        decoded = tokenService.verifyToken(token, config.jwtSecret);
      } catch {
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      }

      const user = await userRepo.findById(decoded.userId);
      if (!user) {
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      }

      const currentTokenVersion = user.tokenVersion ?? user.token_version;
      if (currentTokenVersion !== decoded.tokenVersion) {
        throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
      }

      // Attach safe user identity only; never include password_hash or token_version
      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export default createAuthMiddleware;
