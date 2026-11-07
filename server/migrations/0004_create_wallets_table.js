/**
 * Migration: Create wallets table
 *
 * Constraints:
 * - user_id: BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE (one wallet per user)
 * - cash_paise: BIGINT NOT NULL, CHECK >= 0 (integer paise; no floating point money)
 * - created_at / updated_at: TIMESTAMPTZ NOT NULL DEFAULT now()
 *
 * Every new user automatically gets a wallet with 1,00,00,000 paise (₹10,00,000)
 * of simulated cash via an AFTER INSERT trigger on users, so the wallet is created
 * in the same transaction as the user and can never be missing. Existing users are
 * backfilled. To change the starting balance for future users, add a new migration
 * that replaces create_wallet_for_new_user().
 */

export async function up(pgm) {
  pgm.sql(`
    CREATE TABLE wallets (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      cash_paise BIGINT NOT NULL CONSTRAINT wallets_cash_paise_check CHECK (cash_paise >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    INSERT INTO wallets (user_id, cash_paise)
    SELECT id, 100000000 FROM users;

    CREATE FUNCTION create_wallet_for_new_user() RETURNS trigger AS $$
    BEGIN
      INSERT INTO wallets (user_id, cash_paise) VALUES (NEW.id, 100000000);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER users_create_wallet
      AFTER INSERT ON users
      FOR EACH ROW EXECUTE FUNCTION create_wallet_for_new_user();
  `);
}

export async function down(pgm) {
  pgm.sql(`
    DROP TRIGGER IF EXISTS users_create_wallet ON users;
    DROP FUNCTION IF EXISTS create_wallet_for_new_user();
    DROP TABLE IF EXISTS wallets;
  `);
}
