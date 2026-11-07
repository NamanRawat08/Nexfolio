/**
 * Migration: Create holdings and orders tables
 *
 * holdings (current position per user and instrument):
 * - PRIMARY KEY (user_id, instrument_id); a row exists only while quantity > 0
 * - quantity: BIGINT > 0 (whole shares)
 * - total_cost_paise: BIGINT >= 0 (cost basis of the whole position, in paise)
 *
 * orders (immutable trade log; all orders are simulated market orders that fill
 * immediately at the latest close):
 * - side: 'BUY' | 'SELL'
 * - quantity, price_paise, total_paise: BIGINT > 0
 * - realized_pnl_paise: BIGINT, set on SELL only
 * - instrument_id references instruments ON DELETE RESTRICT so history is never lost
 */

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE holdings (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      instrument_id BIGINT NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
      quantity BIGINT NOT NULL CONSTRAINT holdings_quantity_check CHECK (quantity > 0),
      total_cost_paise BIGINT NOT NULL CONSTRAINT holdings_total_cost_check CHECK (total_cost_paise >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, instrument_id)
    );

    CREATE TABLE orders (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      instrument_id BIGINT NOT NULL REFERENCES instruments(id) ON DELETE RESTRICT,
      side TEXT NOT NULL CONSTRAINT orders_side_check CHECK (side IN ('BUY', 'SELL')),
      quantity BIGINT NOT NULL CONSTRAINT orders_quantity_check CHECK (quantity > 0),
      price_paise BIGINT NOT NULL CONSTRAINT orders_price_check CHECK (price_paise > 0),
      total_paise BIGINT NOT NULL CONSTRAINT orders_total_check CHECK (total_paise > 0),
      realized_pnl_paise BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX orders_user_created_idx ON orders (user_id, created_at DESC, id DESC);
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS holdings;
  `);
}
