import { query as defaultQuery } from '../db/pool.js';

/**
 * Creates a new user in the database.
 * Explicitly selects returning columns; never returns password_hash.
 *
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.username
 * @param {string} params.passwordHash
 * @param {Function} [query=defaultQuery] - Injected query function
 * @returns {Promise<{ id: string|number, email: string, username: string, tokenVersion: number, createdAt: string, updatedAt: string }>}
 */
export async function createUser({ email, username, passwordHash }, query = defaultQuery) {
  const sql = `
    INSERT INTO users (email, username, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, email, username, token_version, created_at, updated_at
  `;
  const result = await query(sql, [email, username, passwordHash]);
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    tokenVersion: Number(row.token_version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Finds a user by email or username (case-insensitive match).
 * This is the ONLY repository function that returns password_hash (required for authentication).
 *
 * @param {string} identifier - Email or username
 * @param {Function} [query=defaultQuery] - Injected query function
 * @returns {Promise<{ id: string|number, email: string, username: string, password_hash: string, tokenVersion: number, createdAt: string, updatedAt: string } | null>}
 */
export async function findByIdentifier(identifier, query = defaultQuery) {
  const sql = `
    SELECT id, email, username, password_hash, token_version, created_at, updated_at
    FROM users
    WHERE lower(email) = lower($1) OR lower(username) = lower($1)
    LIMIT 1
  `;
  const result = await query(sql, [identifier]);
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    password_hash: row.password_hash,
    tokenVersion: Number(row.token_version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Finds a user by ID.
 * Explicitly selects columns without password_hash.
 *
 * @param {string|number} id - User ID
 * @param {Function} [query=defaultQuery] - Injected query function
 * @returns {Promise<{ id: string|number, email: string, username: string, tokenVersion: number, createdAt: string, updatedAt: string } | null>}
 */
export async function findById(id, query = defaultQuery) {
  const sql = `
    SELECT id, email, username, token_version, created_at, updated_at
    FROM users
    WHERE id = $1
    LIMIT 1
  `;
  const result = await query(sql, [id]);
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    tokenVersion: Number(row.token_version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Increments the token_version column for session invalidation.
 *
 * @param {string|number} id - User ID
 * @param {Function} [query=defaultQuery] - Injected query function
 * @returns {Promise<{ id: string|number, tokenVersion: number } | null>}
 */
export async function incrementTokenVersion(id, query = defaultQuery) {
  const sql = `
    UPDATE users
    SET token_version = token_version + 1, updated_at = now()
    WHERE id = $1
    RETURNING id, token_version
  `;
  const result = await query(sql, [id]);
  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    tokenVersion: Number(row.token_version),
  };
}

/**
 * Repository factory allowing complete dependency injection of the query function.
 *
 * @param {Function} [query=defaultQuery]
 */
export function createUserRepository(query = defaultQuery) {
  return {
    createUser: (params) => createUser(params, query),
    findByIdentifier: (identifier) => findByIdentifier(identifier, query),
    findById: (id) => findById(id, query),
    incrementTokenVersion: (id) => incrementTokenVersion(id, query),
  };
}

export default {
  createUser,
  findByIdentifier,
  findById,
  incrementTokenVersion,
  createUserRepository,
};
