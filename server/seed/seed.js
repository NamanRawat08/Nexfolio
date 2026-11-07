import { getPool, closePool } from '../src/db/pool.js';
import { instrumentsData } from './instruments.data.js';
import { generateHistory, daysInclusive, MARKET_START_DATE } from './priceGenerator.js';
import { insertPriceRows } from './priceRows.js';
import { todayUtc } from './advance.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Seed script cannot run in production');
  process.exit(1);
}

/**
 * Executes database seeding for instruments and deterministic price history.
 *
 * @returns {Promise<{ instrumentsInserted: number, priceHistoryInserted: number }>}
 */
export async function runSeed() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert instruments with ON CONFLICT ((upper(symbol))) DO NOTHING
    let instrumentsInserted = 0;
    for (const inst of instrumentsData) {
      const res = await client.query(
        `INSERT INTO instruments (symbol, name, sector)
         VALUES ($1, $2, $3)
         ON CONFLICT ((upper(symbol))) DO NOTHING`,
        [inst.symbol, inst.name, inst.sector]
      );
      instrumentsInserted += res.rowCount;
    }

    // 2. Fetch instrument IDs mapped by uppercase symbol
    const idRes = await client.query('SELECT id, upper(symbol) AS symbol FROM instruments');
    const symbolToId = new Map(idRes.rows.map((r) => [r.symbol, r.id]));

    // 3. Generate price history from MARKET_START_DATE through today and insert in batches
    const endDate = todayUtc();
    const days = daysInclusive(MARKET_START_DATE, endDate);
    const rows = [];
    for (const inst of instrumentsData) {
      const instrumentId = symbolToId.get(inst.symbol.toUpperCase());
      if (!instrumentId) continue;

      const history = generateHistory({
        basePricePaise: inst.basePricePaise,
        seed: inst.symbol,
        days,
        endDate,
      });
      for (const point of history) {
        rows.push({ instrumentId, date: point.date, closePaise: point.closePaise });
      }
    }
    const priceHistoryInserted = await insertPriceRows((text, params) => client.query(text, params), rows);

    await client.query('COMMIT');
    console.log(`Seeded ${instrumentsInserted} new instruments and ${priceHistoryInserted} price history records.`);
    return { instrumentsInserted, priceHistoryInserted };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding transaction failed:', err && err.message ? err.message : err);
    throw err;
  } finally {
    client.release();
    await closePool();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSeed().catch(() => {
    process.exit(1);
  });
}
