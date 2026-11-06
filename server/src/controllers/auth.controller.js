const COOKIE_NAME = 'nexfolio_token';
const COOKIE_MAX_AGE_MS = 86400000; // 24 hours (86,400 seconds)

/**
 * Generates cookie configuration options.
 *
 * @param {object} [config={}]
 * @returns {import('express').CookieOptions}
 */
function getCookieOptions(config = {}) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
  };
}

/**
 * Factory creating the authentication controller.
 *
 * @param {object} options
 * @param {object} options.authService - Authentication domain service
 * @param {object} [options.config={}] - Application configuration
 */
export function createAuthController({ authService, config = {} } = {}) {
  if (!authService) {
    throw new Error('authService is required for createAuthController');
  }

  const cookieOptions = getCookieOptions(config);

  return {
    /**
     * Handles user registration.
     * Responds with 201 and created user; does not log the user in.
     */
    async register(req, res, next) {
      try {
        const user = await authService.register(req.body);
        return res.status(201).json({ user });
      } catch (err) {
        return next(err);
      }
    },

    /**
     * Handles user login.
     * Sets httpOnly cookie with JWT; the token NEVER appears in response body.
     */
    async login(req, res, next) {
      try {
        const { user, token } = await authService.login(req.body);

        res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: COOKIE_MAX_AGE_MS,
        });

        return res.status(200).json({ user });
      } catch (err) {
        return next(err);
      }
    },

    /**
     * Handles user logout.
     * Requires authentication; invalidates tokens and clears the cookie.
     */
    async logout(req, res, next) {
      try {
        await authService.logout(req.user.id);
        res.clearCookie(COOKIE_NAME, cookieOptions);
        return res.status(204).send();
      } catch (err) {
        return next(err);
      }
    },

    /**
     * Retrieves the current authenticated user's profile.
     */
    async me(req, res, next) {
      try {
        const user = await authService.getCurrentUser(req.user.id);
        return res.status(200).json({ user });
      } catch (err) {
        return next(err);
      }
    },
  };
}

export default createAuthController;
