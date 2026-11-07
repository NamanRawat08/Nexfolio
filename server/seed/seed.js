import { getPool, closePool } from '../src/db/pool.js';
import { instrumentsData } from './instruments.data.js';
import { generateHistory, formatPaiseToRupees } from './priceGenerator.js';

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

    // 3. Generate price history and insert in batches
    let priceHistoryInserted = 0;
    const BATCH_SIZE = 500;
    let batchValues = [];
    let batchParams = [];
    let paramIndex = 1;

    for (const inst of instrumentsData) {
      const instrumentId = symbolToId.get(inst.symbol.toUpperCase());
      if (!instrumentId) continue;

      const history = generateHistory({
        basePricePaise: inst.basePricePaise,
        seed: inst.symbol,
      });

      for (const point of history) {
        const closePriceStr = formatPaiseToRupees(point.closePaise);
        batchValues.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
        batchParams.push(instrumentId, point.date, closePriceStr);
        paramIndex += 3;

        if (batchValues.length >= BATCH_SIZE) {
          const insertQuery = `
            INSERT INTO price_history (instrument_id, trade_date, close_price)
            VALUES ${batchValues.join(', ')}
            ON CONFLICT (instrument_id, trade_date) DO NOTHING
          `;
          const bRes = await client.query(insertQuery, batchParams);
          priceHistoryInserted += bRes.rowCount;
          batchValues = [];
          batchParams = [];
          paramIndex = 1;
        }
      }
    }

    if (batchValues.length > 0) {
      const insertQuery = `
        INSERT INTO price_history (instrument_id, trade_date, close_price)
        VALUES ${batchValues.join(', ')}
        ON CONFLICT (instrument_id, trade_date) DO NOTHING
      `;
      const bRes = await client.query(insertQuery, batchParams);
      priceHistoryInserted += bRes.rowCount;
    }

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
