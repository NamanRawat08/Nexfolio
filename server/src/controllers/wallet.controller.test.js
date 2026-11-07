import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWalletController } from './wallet.controller.js';

describe('wallet.controller', () => {
  function createMockRes() {
    return {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
  }

  it('throws when walletRepo is missing', () => {
    assert.throws(() => createWalletController(), /walletRepo is required/);
  });

  it('returns 200 with cash in paise and rupees for the authenticated user only', async () => {
    let askedFor;
    const controller = createWalletController({
      walletRepo: {
        async findByUserId(id) {
          askedFor = id;
          return { userId: id, cashPaise: '100000000' };
        },
      },
    });
    const res = createMockRes();
    await controller.get({ user: { id: '42' }, query: { userId: '99' } }, res, () => {});
    assert.equal(askedFor, '42');
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      wallet: { cashPaise: '100000000', cash: '1000000.00', currency: 'INR' },
    });
  });

  it('returns 404 WALLET_NOT_FOUND when missing', async () => {
    const controller = createWalletController({ walletRepo: { findByUserId: async () => null } });
    let error;
    await controller.get({ user: { id: '1' } }, createMockRes(), (e) => {
      error = e;
    });
    assert.equal(error.statusCode, 404);
    assert.equal(error.code, 'WALLET_NOT_FOUND');
  });

  it('forwards repository errors to next', async () => {
    const boom = new Error('db');
    const controller = createWalletController({
      walletRepo: {
        async findByUserId() {
          throw boom;
        },
      },
    });
    let error;
    await controller.get({ user: { id: '1' } }, createMockRes(), (e) => {
      error = e;
    });
    assert.equal(error, boom);
  });
});
