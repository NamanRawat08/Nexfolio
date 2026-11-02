import jwt from 'jsonwebtoken';

const ALGORITHM = 'HS256';
const EXPIRES_IN_SECONDS = 86400; // 1 day

/**
 * Signs a JWT with pinned HS256 algorithm and standard payload claims.
 *
 * @param {object} params
 * @param {string|number} params.userId - User identifier
 * @param {number} params.tokenVersion - Token version for session invalidation
 * @param {string} secret - JWT signing secret
 * @returns {string}
 */
export function signToken({ userId, tokenVersion }, secret) {
  if (!secret || typeof secret !== 'string') {
    throw new Error('Secret is required for signing token');
  }

  return jwt.sign(
    {
      sub: String(userId),
      tv: Number(tokenVersion),
    },
    secret,
    {
      algorithm: ALGORITHM,
      expiresIn: EXPIRES_IN_SECONDS,
    }
  );
}

/**
 * Verifies a JWT with pinned HS256 algorithm and returns the extracted claims.
 * Never trusts algorithm specified by the token header.
 *
 * @param {string} token - JWT string
 * @param {string} secret - JWT signing secret
 * @returns {{ userId: string, tokenVersion: number }}
 */
export function verifyToken(token, secret) {
  if (!secret || typeof secret !== 'string') {
    throw new Error('Secret is required for verifying token');
  }

  const decoded = jwt.verify(token, secret, {
    algorithms: [ALGORITHM],
  });

  if (!decoded || typeof decoded !== 'object' || !decoded.sub || decoded.tv === undefined) {
    throw new Error('Invalid token payload');
  }

  return {
    userId: decoded.sub,
    tokenVersion: Number(decoded.tv),
  };
}

export default {
  signToken,
  verifyToken,
};
