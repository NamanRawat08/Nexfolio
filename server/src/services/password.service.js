import bcrypt from 'bcrypt';

let cachedDummyHash = null;
let cachedCost = null;

/**
 * Hashes a plaintext password using bcrypt.
 *
 * @param {string} plain - Plaintext password
 * @param {number} [cost=12] - Salt rounds / cost factor
 * @returns {Promise<string>}
 */
export async function hashPassword(plain, cost = 12) {
  return bcrypt.hash(plain, cost);
}

/**
 * Verifies a plaintext password against a bcrypt hash.
 *
 * @param {string} plain - Plaintext password
 * @param {string} hash - Bcrypt hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/**
 * Lazily generates and caches a dummy bcrypt hash at the given cost factor.
 * Used for timing equalization during authentication when a user is not found.
 *
 * @param {number} [cost=12]
 * @returns {Promise<string>}
 */
export async function getDummyHash(cost = 12) {
  if (!cachedDummyHash || cachedCost !== cost) {
    cachedDummyHash = await hashPassword('__nexfolio_timing_equalization_dummy__', cost);
    cachedCost = cost;
  }
  return cachedDummyHash;
}

export default {
  hashPassword,
  verifyPassword,
  getDummyHash,
};
