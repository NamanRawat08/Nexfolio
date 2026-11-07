/**
 * Migration: Create watchlist_items table
 *
 * Constraints:
 * - PRIMARY KEY (user_id, instrument_id): an instrument appears at most once per user
 * - user_id references users ON DELETE CASCADE; instrument_id references instruments ON DELETE CASCADE
 * - created_at: TIMESTAMPTZ NOT NULL DEFAULT now() (used to list newest first)
 */

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE watchlist_items (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      instrument_id BIGINT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, instrument_id)
    );

    CREATE INDEX watchlist_items_user_created_idx ON watchlist_items (user_id, created_at DESC);
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS watchlist_items;
  `);
}
