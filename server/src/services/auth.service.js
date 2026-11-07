import { AppError } from '../utils/AppError.js';
import * as defaultPasswordService from './password.service.js';
import * as defaultTokenService from './token.service.js';
import * as defaultUserRepo from '../repositories/user.repository.js';

/**
 * Validates email format.
 * - String type
 * - Trimmed length between 3 and 254 chars
 * - Exactly one '@'
 * - Non-empty local part and domain part
 * - Domain part contains at least one dot, neither leading nor trailing
 *
 * @param {any} email
 * @returns {string} Lowercased, trimmed email
 */
function validateEmail(email) {
  if (typeof email !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Email must be a string');
  }

  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 254) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Email must be between 3 and 254 characters');
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Email must contain exactly one @ symbol');
  }

  const [local, domain] = parts;
  if (!local || !domain) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid email format');
  }

  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Email domain must contain a valid dot');
  }

  return trimmed.toLowerCase();
}

/**
 * Validates username format.
 * - String type
 * - Trimmed length between 3 and 30 chars
 * - Alphanumeric and underscores only
 *
 * @param {any} username
 * @returns {string} Trimmed username
 */
function validateUsername(username) {
  if (typeof username !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Username must be a string');
  }

  const trimmed = username.trim();
  const usernameRegex = /^[A-Za-z0-9_]{3,30}$/;
  if (!usernameRegex.test(trimmed)) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Username must be between 3 and 30 characters and contain only letters, numbers, and underscores'
    );
  }

  return trimmed;
}

/**
 * Validates password format for registration.
 * - String type
 * - Byte length between 8 and 72 bytes (Bcrypt limit)
 * - Never echoes password in error
 *
 * @param {any} password
 * @returns {string} Plain password
 */
function validatePassword(password) {
  if (typeof password !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Password must be a string');
  }

  const byteLength = Buffer.byteLength(password, 'utf8');
  if (byteLength < 8 || byteLength > 72) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Password must be between 8 and 72 bytes');
  }

  return password;
}

/**
 * Validates identifier (email or username) for login.
 * - String type
 * - Trimmed length between 1 and 254 chars
 *
 * @param {any} identifier
 * @returns {string} Trimmed identifier
 */
function validateIdentifier(identifier) {
  if (typeof identifier !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Email or username must be a string');
  }

  const trimmed = identifier.trim();
  if (trimmed.length < 1 || trimmed.length > 254) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Email or username is required');
  }

  return trimmed;
}

/**
 * Validates password format for login.
 * - String type
 * - Byte length between 1 and 72 bytes
 *
 * @param {any} password
 * @returns {string} Plain password
 */
function validateLoginPassword(password) {
  if (typeof password !== 'string') {
    throw new AppError(400, 'VALIDATION_ERROR', 'Password must be a string');
  }

  const byteLength = Buffer.byteLength(password, 'utf8');
  if (byteLength < 1 || byteLength > 72) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Password is required and must not exceed 72 bytes');
  }

  return password;
}

/**
 * Factory creating an authentication service with injected dependencies.
 *
 * @param {object} options
 * @param {object} [options.userRepo=defaultUserRepo]
 * @param {object} [options.passwordService=defaultPasswordService]
 * @param {object} [options.tokenService=defaultTokenService]
 * @param {object} [options.config={}]
 */
export function createAuthService({
  userRepo = defaultUserRepo,
  passwordService = defaultPasswordService,
  tokenService = defaultTokenService,
  config = {},
} = {}) {
  const bcryptCost = config.bcryptCost ?? 12;

  return {
    /**
     * Registers a new user.
     *
     * @param {object} params
     * @param {string} params.email
     * @param {string} params.username
     * @param {string} params.password
     * @returns {Promise<{ id: string|number, email: string, username: string, createdAt: string }>}
     */
    async register(params) {
      if (!params || typeof params !== 'object') {
        throw new AppError(400, 'VALIDATION_ERROR', 'Registration data must be an object');
      }

      const email = validateEmail(params.email);
      const username = validateUsername(params.username);
      const password = validatePassword(params.password);

      const passwordHash = await passwordService.hashPassword(password, bcryptCost);

      let createdUser;
      try {
        createdUser = await userRepo.createUser({
          email,
          username,
          passwordHash,
        });
      } catch (err) {
        if (err && err.code === '23505') {
          if (err.constraint === 'users_email_lower_key') {
            throw new AppError(409, 'EMAIL_TAKEN', 'Email already registered');
          }
          if (err.constraint === 'users_username_lower_key') {
            throw new AppError(409, 'USERNAME_TAKEN', 'Username already taken');
          }
          throw new AppError(409, 'CONFLICT', 'User already exists');
        }
        throw err;
      }

      return {
        id: createdUser.id,
        email: createdUser.email,
        username: createdUser.username,
        createdAt: createdUser.createdAt ?? createdUser.created_at,
      };
    },

    /**
     * Authenticates a user by email or username.
     * Equalizes timing between unknown user and incorrect password.
     *
     * @param {object} params
     * @param {string} params.identifier
     * @param {string} params.password
     * @returns {Promise<{ user: { id: string|number, email: string, username: string }, token: string }>}
     */
    async login(params) {
      if (!params || typeof params !== 'object') {
        throw new AppError(400, 'VALIDATION_ERROR', 'Login data must be an object');
      }

      const identifier = validateIdentifier(params.identifier);
      const password = validateLoginPassword(params.password);

      const user = await userRepo.findByIdentifier(identifier);

      if (!user) {
        // Equalize timing using dummy hash generated at identical bcrypt cost
        const dummyHash = await passwordService.getDummyHash(bcryptCost);
        await passwordService.verifyPassword(password, dummyHash);
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
      }

      const isValid = await passwordService.verifyPassword(password, user.password_hash);
      if (!isValid) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
      }

      const tokenVersion = user.tokenVersion ?? user.token_version ?? 0;
      const token = tokenService.signToken(
        { userId: user.id, tokenVersion },
        config.jwtSecret
      );

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        token,
      };
    },

    /**
     * Changes the signed-in user's password. The current password must be correct. Every
     * existing session is signed out (token version bump); the caller gets a fresh token so the
     * device that made the change stays signed in.
     *
     * @param {string|number} userId
     * @param {object} params
     * @param {string} params.currentPassword
     * @param {string} params.newPassword
     * @returns {Promise<{ token: string }>}
     */
    async changePassword(userId, params) {
      if (!userId) {
        throw new AppError(400, 'VALIDATION_ERROR', 'User ID is required');
      }
      if (!params || typeof params !== 'object') {
        throw new AppError(400, 'VALIDATION_ERROR', 'Password data must be an object');
      }

      const currentPassword = validateLoginPassword(params.currentPassword);
      const newPassword = validatePassword(params.newPassword);

      const record = await userRepo.findPasswordHashById(userId);
      if (!record) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }

      const matches = await passwordService.verifyPassword(currentPassword, record.passwordHash);
      if (!matches) {
        // Not 401: the session itself is valid, and a 401 would sign the user out in the client.
        throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
      }
      if (newPassword === currentPassword) {
        throw new AppError(400, 'PASSWORD_UNCHANGED', 'New password must be different from the current one');
      }

      const newHash = await passwordService.hashPassword(newPassword, bcryptCost);
      const updated = await userRepo.updatePasswordHash(userId, newHash);
      if (!updated) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }

      const token = tokenService.signToken(
        { userId: updated.id, tokenVersion: updated.tokenVersion },
        config.jwtSecret
      );
      return { token };
    },

    /**
     * Logs out a user by incrementing their token version (invalidating existing tokens).
     *
     * @param {string|number} userId
     * @returns {Promise<{ success: boolean }>}
     */
    async logout(userId) {
      if (!userId) {
        throw new AppError(400, 'VALIDATION_ERROR', 'User ID is required');
      }

      await userRepo.incrementTokenVersion(userId);
      return { success: true };
    },

    /**
     * Retrieves the current user's profile.
     *
     * @param {string|number} userId
     * @returns {Promise<{ id: string|number, email: string, username: string, createdAt: string }>}
     */
    async getCurrentUser(userId) {
      if (!userId) {
        throw new AppError(400, 'VALIDATION_ERROR', 'User ID is required');
      }

      const user = await userRepo.findById(userId);
      if (!user) {
        throw new AppError(401, 'UNAUTHENTICATED', 'User not found');
      }

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.createdAt ?? user.created_at,
      };
    },
  };
}

export default {
  createAuthService,
};
