import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from './index.js';

describe('loadConfig', () => {
  const validBaseEnv = {
    NODE_ENV: 'test',
    PORT: '5001',
    CLIENT_ORIGIN: 'http://localhost:5173',
    DATABASE_URL: 'postgresql://testuser:testpass@localhost:5432/testdb',
  };

  it('valid input returns a frozen config object with correct properties', () => {
    const config = loadConfig(validBaseEnv);
    assert.equal(config.nodeEnv, 'test');
    assert.equal(config.port, 5001);
    assert.equal(config.clientOrigin, 'http://localhost:5173');
    assert.equal(config.databaseUrl, 'postgresql://testuser:testpass@localhost:5432/testdb');
    assert.equal(Object.isFrozen(config), true);
  });

  it('missing DATABASE_URL throws without leaking values', () => {
    const env = { ...validBaseEnv };
    delete env.DATABASE_URL;

    assert.throws(
      () => loadConfig(env),
      (err) => {
        assert.match(err.message, /DATABASE_URL/);
        return true;
      }
    );
  });

  it('non-postgres DATABASE_URL throws without leaking the secret value', () => {
    const fakeSecret = 'postgresql-fake-secret-value';
    const invalidPrefix = 'mysql://user:pass@localhost:3306/db';
    const env = { ...validBaseEnv, DATABASE_URL: invalidPrefix };

    assert.throws(
      () => loadConfig(env),
      (err) => {
        assert.match(err.message, /DATABASE_URL/);
        assert.equal(err.message.includes(invalidPrefix), false);
        return true;
      }
    );

    // Also verify non-postgres URL containing fake secret does not leak
    assert.throws(
      () => loadConfig({ ...validBaseEnv, DATABASE_URL: `sqlite://${fakeSecret}` }),
      (err) => {
        assert.match(err.message, /DATABASE_URL/);
        assert.equal(err.message.includes(fakeSecret), false);
        return true;
      }
    );
  });

  it('bad PORT throws without leaking the supplied value', () => {
    const badPort = '99999';
    const env = { ...validBaseEnv, PORT: badPort };

    assert.throws(
      () => loadConfig(env),
      (err) => {
        assert.match(err.message, /PORT/);
        assert.equal(err.message.includes(badPort), false);
        return true;
      }
    );

    const nonIntegerPort = 'not-a-port';
    assert.throws(
      () => loadConfig({ ...validBaseEnv, PORT: nonIntegerPort }),
      (err) => {
        assert.match(err.message, /PORT/);
        assert.equal(err.message.includes(nonIntegerPort), false);
        return true;
      }
    );
  });

  it('bad NODE_ENV throws without leaking the supplied value', () => {
    const badEnv = 'invalid-env-mode';
    assert.throws(
      () => loadConfig({ ...validBaseEnv, NODE_ENV: badEnv }),
      (err) => {
        assert.match(err.message, /NODE_ENV/);
        assert.equal(err.message.includes(badEnv), false);
        return true;
      }
    );
  });

  it('bad CLIENT_ORIGIN throws without leaking the supplied value', () => {
    const badOrigin = 'ftp://invalid-origin';
    assert.throws(
      () => loadConfig({ ...validBaseEnv, CLIENT_ORIGIN: badOrigin }),
      (err) => {
        assert.match(err.message, /CLIENT_ORIGIN/);
        assert.equal(err.message.includes(badOrigin), false);
        return true;
      }
    );
  });
});
