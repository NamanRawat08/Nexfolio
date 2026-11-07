/**
 * Migration: Create notifications table
 *
 * Constraints:
 * - user_id references users ON DELETE CASCADE; order_id references orders ON DELETE CASCADE
 * - kind: 'ORDER_FILLED' (a pending limit order was filled by the matching job)
 * - title (1..100 chars) and body (1..500 chars) are plain text written by the server
 * - UNIQUE (order_id, kind): an order produces at most one notification of each kind
 * - read_at is NULL until the user marks the notification as read
 */

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE notifications (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CONSTRAINT notifications_kind_check CHECK (kind IN ('ORDER_FILLED')),
      title TEXT NOT NULL CONSTRAINT notifications_title_check CHECK (char_length(title) BETWEEN 1 AND 100),
      body TEXT NOT NULL CONSTRAINT notifications_body_check CHECK (char_length(body) BETWEEN 1 AND 500),
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT notifications_order_kind_key UNIQUE (order_id, kind)
    );

    CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at DESC, id DESC);
    CREATE INDEX notifications_user_unread_idx ON notifications (user_id) WHERE read_at IS NULL;
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS notifications;
  `);
}
