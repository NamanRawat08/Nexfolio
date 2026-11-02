import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// We test the pool module's closePool function by importing it directly.
// Since pool.js imports getConfig() which triggers dotenv, we must ensure
// that tests do not rely on server/.env — loadConfig.js is the pure function.
// pool.js only calls getConfig() inside getPool() (lazy), so importing pool.js
// itself does not establish a DB connection or require DATABASE_URL at import time.
import { closePool } from '../db/pool.js';

describe('closePool', () => {
  it('is safe to call when no pool has been created', async () => {
    // Should resolve without error even if pool was never initialized
    await assert.doesNotReject(
      () => closePool(),
      'closePool() should not throw when no pool was created'
    );
  });

  it('is safe to call multiple times', async () => {
    // Call twice in succession - both should resolve without error
    await assert.doesNotReject(async () => {
      await closePool();
      await closePool();
    }, 'closePool() called twice should not throw');
  });
});
