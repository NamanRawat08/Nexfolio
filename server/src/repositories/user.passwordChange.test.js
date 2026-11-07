import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findPasswordHashById, updatePasswordHash, createUserRepository } from './user.repository.js';

describe('user.repository password change', () => {
  it('findPasswordHashById reads only id and password_hash, parameterized', async () => {
    let captured;
    const row = await findPasswordHashById('3', async (sql, params) => {
      captured = { sql, params };
      return { rows: [{ id: 3, password_hash: 'hash' }] };
    });
    assert.deepEqual(row, { id: 3, passwordHash: 'hash' });
    assert.deepEqual(captured.params, ['3']);
    assert.ok(!/select\s+\*/i.test(captured.sql));
    assert.equal(await findPasswordHashById('3', async () => ({ rows: [] })), null);
  });

  it('updatePasswordHash sets the hash and bumps token_version in one statement', async () => {
    let captured;
    const result = await updatePasswordHash('3', 'newhash', async (sql, params) => {
      captured = { sql, params };
      return { rows: [{ id: 3, token_version: '5' }] };
    });
    assert.deepEqual(result, { id: 3, tokenVersion: 5 });
    assert.deepEqual(captured.params, ['3', 'newhash']);
    assert.match(captured.sql, /token_version = token_version \+ 1/);
    assert.match(captured.sql, /password_hash = \$2/);
    assert.equal(await updatePasswordHash('9', 'h', async () => ({ rows: [] })), null);
  });

  it('factory exposes both functions bound to the injected query', async () => {
    const repo = createUserRepository(async () => ({ rows: [] }));
    assert.equal(await repo.findPasswordHashById('1'), null);
    assert.equal(await repo.updatePasswordHash('1', 'h'), null);
  });
});
