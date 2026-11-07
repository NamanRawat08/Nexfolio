/**
 * Migration: Create price_history table
 *
 * Constraints:
 * - instrument_id: BIGINT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE
 * - trade_date: DATE NOT NULL
 * - close_price: NUMERIC(12,2) NOT NULL CHECK (close_price > 0)
 * - PRIMARY KEY (instrument_id, trade_date)
 */

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE price_history (
      instrument_id BIGINT NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
      trade_date DATE NOT NULL,
      close_price NUMERIC(12,2) NOT NULL CONSTRAINT price_history_close_price_check CHECK (close_price > 0),
      PRIMARY KEY (instrument_id, trade_date)
    );
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS price_history CASCADE;
  `);
}
