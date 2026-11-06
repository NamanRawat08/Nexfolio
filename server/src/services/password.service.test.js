import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, getDummyHash } from './password.service.js';

describe('password.service', () => {
  const TEST_COST = 4; // Fast for testing

  it('hashes password and verifies successfully with correct password', async () => {
    const plain = 'superSecretPassword123';
    const hash = await hashPassword(plain, TEST_COST);

    assert.equal(typeof hash, 'string');
    assert.match(hash, /^\$2[aby]\$\d{2}\$/);

    const isValid = await verifyPassword(plain, hash);
    assert.equal(isValid, true);
  });

  it('rejects incorrect password verification', async () => {
    const plain = 'correctPassword';
    const hash = await hashPassword(plain, TEST_COST);

    const isValid = await verifyPassword('wrongPassword', hash);
    assert.equal(isValid, false);
  });

  it('generates different hashes for identical plaintext passwords due to salt', async () => {
    const plain = 'samePasswordEveryTime';
    const hash1 = await hashPassword(plain, TEST_COST);
    const hash2 = await hashPassword(plain, TEST_COST);

    assert.notEqual(hash1, hash2);
    assert.equal(await verifyPassword(plain, hash1), true);
    assert.equal(await verifyPassword(plain, hash2), true);
  });

  it('getDummyHash generates, caches, and returns a valid hash', async () => {
    const hash1 = await getDummyHash(TEST_COST);
    const hash2 = await getDummyHash(TEST_COST);

    assert.equal(typeof hash1, 'string');
    assert.match(hash1, /^\$2[aby]\$\d{2}\$/);
    assert.equal(hash1, hash2); // Verify cached instance

    const isMatch = await verifyPassword('someRandomAttempt', hash1);
    assert.equal(isMatch, false);
  });
});
