import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDbHealthController } from '../controllers/health.controller.js';

describe('createDbHealthController', () => {
  function createFakeRes() {
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

  it('returns 200 with correct body shape on successful query', async () => {
    const fakeQuery = async () => ({ rows: [{ '?column?': 1 }] });
    const handler = createDbHealthController({ query: fakeQuery, timeoutMs: 2000 });
    const res = createFakeRes();
    const req = {};
    const next = () => {};

    await handler(req, res, next);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database, 'up');
    assert.ok(typeof res.body.timestamp === 'string');
    // Verify ISO string format
    assert.ok(!isNaN(Date.parse(res.body.timestamp)));
  });

  it('returns 503 DB_UNAVAILABLE when query rejects, body does not contain fake error text', async () => {
    const secretText = 'pg secret detail';
    const fakeQuery = async () => { throw new Error(secretText); };
    const handler = createDbHealthController({ query: fakeQuery, timeoutMs: 2000 });
    const res = createFakeRes();
    const req = { method: 'GET', path: '/api/health/db' };
    let caughtError = null;
    const next = (err) => { caughtError = err; };

    await handler(req, res, next);

    assert.ok(caughtError !== null, 'next() should have been called with an error');
    assert.equal(caughtError.statusCode, 503);
    assert.equal(caughtError.code, 'DB_UNAVAILABLE');
    assert.equal(caughtError.message, 'Database unavailable');
    assert.equal(caughtError.isOperational, true);
    // Verify the error passed to next does NOT contain the fake error text
    const serialized = JSON.stringify(caughtError);
    assert.equal(serialized.includes(secretText), false);
  });

  it('returns 503 DB_UNAVAILABLE on timeout with a short injectable timeout', async () => {
    // Query that never resolves
    const fakeQuery = () => new Promise(() => {});
    const handler = createDbHealthController({ query: fakeQuery, timeoutMs: 10 }); // 10ms timeout
    const res = createFakeRes();
    const req = { method: 'GET', path: '/api/health/db' };
    let caughtError = null;
    const next = (err) => { caughtError = err; };

    await handler(req, res, next);

    assert.ok(caughtError !== null, 'next() should have been called with an error on timeout');
    assert.equal(caughtError.statusCode, 503);
    assert.equal(caughtError.code, 'DB_UNAVAILABLE');
    assert.equal(caughtError.message, 'Database unavailable');
  });
});
