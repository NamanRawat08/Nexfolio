/**
 * Migration: Add limit orders to the orders table
 *
 * New columns:
 * - order_type: 'MARKET' | 'LIMIT' (existing rows are MARKET)
 * - status: 'PENDING' | 'FILLED' | 'CANCELLED' (existing rows are FILLED)
 * - limit_price_paise: BIGINT > 0, present exactly when order_type = 'LIMIT'
 * - placed_price_date: the latest price date known when a limit order was placed; only
 *   later closes can fill it
 * - executed_on: the market date a filled order executed (backfilled from created_at);
 *   portfolio history replays orders on this date
 * - updated_at
 *
 * price_paise and total_paise become nullable because a pending or cancelled order has no
 * fill yet; a CHECK keeps FILLED orders complete. Pending orders reserve cash (BUY) or
 * shares (SELL) in application logic; the partial index serves the matching job.
 *
 * down() deletes PENDING and CANCELLED orders (they cannot exist in the old shape).
 */

export async function up(pgm) {
  pgm.sql(`
    ALTER TABLE orders
      ADD COLUMN order_type TEXT NOT NULL DEFAULT 'MARKET'
        CONSTRAINT orders_order_type_check CHECK (order_type IN ('MARKET', 'LIMIT')),
      ADD COLUMN status TEXT NOT NULL DEFAULT 'FILLED'
        CONSTRAINT orders_status_check CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED')),
      ADD COLUMN limit_price_paise BIGINT
        CONSTRAINT orders_limit_price_check CHECK (limit_price_paise > 0),
      ADD COLUMN placed_price_date DATE,
      ADD COLUMN executed_on DATE,
      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

    UPDATE orders SET executed_on = (created_at AT TIME ZONE 'UTC')::date;

    ALTER TABLE orders
      ALTER COLUMN price_paise DROP NOT NULL,
      ALTER COLUMN total_paise DROP NOT NULL;

    ALTER TABLE orders
      ADD CONSTRAINT orders_state_check CHECK (
        (status = 'FILLED' AND price_paise IS NOT NULL AND total_paise IS NOT NULL AND executed_on IS NOT NULL)
        OR (status = 'PENDING' AND order_type = 'LIMIT' AND price_paise IS NULL AND total_paise IS NULL AND executed_on IS NULL)
        OR (status = 'CANCELLED' AND price_paise IS NULL AND total_paise IS NULL AND executed_on IS NULL)
      ),
      ADD CONSTRAINT orders_limit_type_check CHECK ((order_type = 'LIMIT') = (limit_price_paise IS NOT NULL));

    CREATE INDEX orders_pending_idx ON orders (created_at, id) WHERE status = 'PENDING';
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP INDEX IF EXISTS orders_pending_idx;

    DELETE FROM orders WHERE status <> 'FILLED';

    ALTER TABLE orders
      DROP CONSTRAINT IF EXISTS orders_state_check,
      DROP CONSTRAINT IF EXISTS orders_limit_type_check;

    ALTER TABLE orders
      ALTER COLUMN price_paise SET NOT NULL,
      ALTER COLUMN total_paise SET NOT NULL;

    ALTER TABLE orders
      DROP COLUMN updated_at,
      DROP COLUMN executed_on,
      DROP COLUMN placed_price_date,
      DROP COLUMN limit_price_paise,
      DROP COLUMN status,
      DROP COLUMN order_type;
  `);
}
