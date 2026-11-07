/**
 * Migration: Create instruments table
 *
 * Constraints:
 * - id: BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
 * - symbol: TEXT NOT NULL, CHECK symbol ~ '^[A-Z0-9&-]{1,20}$'
 * - name: TEXT NOT NULL, CHECK char_length(name) BETWEEN 1 AND 100
 * - sector: TEXT NOT NULL
 * - created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
 * - UNIQUE INDEX instruments_symbol_upper_key ON instruments (upper(symbol))
 */

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE instruments (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      symbol TEXT NOT NULL,
      name TEXT NOT NULL,
      sector TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT instruments_symbol_check CHECK (symbol ~ '^[A-Z0-9&-]{1,20}$'),
      CONSTRAINT instruments_name_check CHECK (char_length(name) BETWEEN 1 AND 100)
    );

    CREATE UNIQUE INDEX instruments_symbol_upper_key ON instruments (upper(symbol));
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TABLE IF EXISTS instruments CASCADE;
  `);
}
