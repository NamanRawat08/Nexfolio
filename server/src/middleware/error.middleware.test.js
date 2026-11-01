import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../utils/AppError.js';
import { errorHandler } from './error.middleware.js';
import { notFoundHandler } from './notFound.middleware.js';

describe('Error & NotFound Middleware', () => {
  function createFakeRes() {
    return {
      statusCode: null,
      body: null,
      headersSent: false,
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

  it('AppError returns its own status, code and message', () => {
    const res = createFakeRes();
    const req = { method: 'GET', path: '/test/app-error' };
    const error = new AppError(400, 'CUSTOM_BAD_REQUEST', 'Specific operational failure');

    errorHandler(error, req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      error: {
        code: 'CUSTOM_BAD_REQUEST',
        message: 'Specific operational failure',
      },
    });
  });

  it('generic Error returns 500 INTERNAL_SERVER_ERROR and body does NOT contain error detail', () => {
    const res = createFakeRes();
    const req = { method: 'GET', path: '/test/generic-error' };
    const secretDetail = 'secret db detail';
    const error = new Error(secretDetail);

    errorHandler(error, req, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
    const serialized = JSON.stringify(res.body);
    assert.equal(serialized.includes(secretDetail), false);
  });

  it('invalid JSON body (entity.parse.failed) returns 400 INVALID_JSON', () => {
    const res = createFakeRes();
    const req = { method: 'POST', path: '/test/json-body' };
    const parseError = new SyntaxError('Unexpected token in JSON at position 0');
    parseError.type = 'entity.parse.failed';

    errorHandler(parseError, req, res, () => {});

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      error: {
        code: 'INVALID_JSON',
        message: 'Request body is not valid JSON',
      },
    });
  });

  it('body over 100kb (entity.too.large) returns 413 PAYLOAD_TOO_LARGE', () => {
    const res = createFakeRes();
    const req = { method: 'POST', path: '/test/json-body' };
    const payloadError = new Error('request entity too large');
    payloadError.type = 'entity.too.large';

    errorHandler(payloadError, req, res, () => {});

    assert.equal(res.statusCode, 413);
    assert.deepEqual(res.body, {
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large',
      },
    });
  });

  it('unknown route returns 404 NOT_FOUND and does not reflect the requested path', () => {
    const res = createFakeRes();
    const sensitivePath = '/unmapped/sensitive/path/name';
    const req = { method: 'GET', originalUrl: sensitivePath, path: sensitivePath };

    notFoundHandler(req, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, {
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found',
      },
    });
    const serialized = JSON.stringify(res.body);
    assert.equal(serialized.includes('sensitive'), false);
    assert.equal(serialized.includes('unmapped'), false);
  });

  it('delegates to next(err) if headers were already sent', () => {
    let delegatedError = null;
    const fakeErr = new Error('Already sent error');
    const req = { method: 'GET', path: '/test' };
    const res = { headersSent: true };
    const next = (err) => {
      delegatedError = err;
    };

    errorHandler(fakeErr, req, res, next);
    assert.equal(delegatedError, fakeErr);
  });
});
