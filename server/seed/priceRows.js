import { formatPaiseToRupees } from './priceGenerator.js';

const BATCH_SIZE = 500;

/**
 * Inserts price rows in batches, skipping any (instrument, date) that already exists.
 *
 * @param {(text: string, params?: any[]) => Promise<{ rowCount: number }>} query - Transaction-bound query function
 * @param {Array<{ instrumentId: string|number, date: string, closePaise: number }>} rows
 * @returns {Promise<number>} Number of rows actually inserted
 */
export async function insertPriceRows(query, rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const values = [];
    const params = [];
    batch.forEach((row, j) => {
      const base = j * 3;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      params.push(row.instrumentId, row.date, formatPaiseToRupees(row.closePaise));
    });
    const result = await query(
      `INSERT INTO price_history (instrument_id, trade_date, close_price)
       VALUES ${values.join(', ')}
       ON CONFLICT (instrument_id, trade_date) DO NOTHING`,
      params
    );
    inserted += result.rowCount;
  }
  return inserted;
}

export default { insertPriceRows };
