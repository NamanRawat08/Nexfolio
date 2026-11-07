import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findByUserId, createWalletRepository } from './wallet.repository.js';

describe('wallet.repository', () => {
  it('returns the wallet with cash kept as a string, using a parameterized query', async () => {
    let captured;
    const query = async (sql, params) => {
      captured = { sql, params };
      return {
        rows: [{ user_id: '7', cash_paise: '100000000', created_at: 'c', updated_at: 'u' }],
      };
    };
    const wallet = await findByUserId('7', query);
    assert.deepEqual(wallet, { userId: '7', cashPaise: '100000000', createdAt: 'c', updatedAt: 'u' });
    assert.deepEqual(captured.params, ['7']);
    assert.ok(!/select\s+\*/i.test(captured.sql));
  });

  it('returns null when no wallet exists', async () => {
    assert.equal(await findByUserId('1', async () => ({ rows: [] })), null);
  });

  it('factory binds the injected query', async () => {
    const repo = createWalletRepository(async () => ({ rows: [] }));
    assert.equal(await repo.findByUserId('1'), null);
  });
});
