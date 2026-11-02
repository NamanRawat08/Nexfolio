/**
 * Migration: Create users table
 *
 * Constraints:
 * - id: BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
 * - email: CHECK char_length between 3 and 254, contains '@' after index 1
 * - username: CHECK alphanumeric and underscore between 3 and 30 chars
 * - password_hash: CHECK not empty string
 * - unique case-insensitive indexes on lower(email) and lower(username)
 */

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE users (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      email TEXT NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      token_version INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT users_email_check CHECK (char_length(email) BETWEEN 3 AND 254 AND position('@' in email) > 1),
      CONSTRAINT users_username_check CHECK (username ~ '^[A-Za-z0-9_]{3,30}$'),
      CONSTRAINT users_password_hash_check CHECK (password_hash <> '')
    );

    CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
    CREATE UNIQUE INDEX users_username_lower_key ON users (lower(username));
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS users;
  `);
}

