import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from './loadConfig.js';

describe('loadConfig', () => {
  const validBaseEnv = {
    NODE_ENV: 'test',
    PORT: '5001',
    CLIENT_ORIGIN: 'http://localhost:5173',
    DATABASE_URL: 'postgresql://testuser:testpass@localhost:5432/testdb',
    JWT_SECRET: 'test_jwt_secret_min_32_characters_long_abcdef123456',
  };

  it('valid input returns a frozen config object with correct properties', () => {
    const config = loadConfig(validBaseEnv);
    assert.equal(config.nodeEnv, 'test');
    assert.equal(config.port, 5001);
    assert.equal(config.clientOrigin, 'http://localhost:5173');
    assert.equal(config.databaseUrl, 'postgresql://testuser:testpass@localhost:5432/testdb');
    assert.equal(config.jwtSecret, 'test_jwt_secret_min_32_characters_long_abcdef123456');
    assert.equal(config.jwtExpiresInSeconds, 86400);
    assert.equal(config.bcryptCost, 12);
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

  it('missing JWT_SECRET throws without leaking values', () => {
    const env = { ...validBaseEnv };
    delete env.JWT_SECRET;

    assert.throws(
      () => loadConfig(env),
      (err) => {
        assert.match(err.message, /JWT_SECRET/);
        return true;
      }
    );
  });

  it('short JWT_SECRET throws without leaking the secret value', () => {
    const shortSecret = 'short-secret-value-123';
    const env = { ...validBaseEnv, JWT_SECRET: shortSecret };

    assert.throws(
      () => loadConfig(env),
      (err) => {
        assert.match(err.message, /JWT_SECRET/);
        assert.equal(err.message.includes(shortSecret), false);
        return true;
      }
    );
  });

  it('valid BCRYPT_COST env parses properly within 4-14', () => {
    const configMin = loadConfig({ ...validBaseEnv, BCRYPT_COST: '4' });
    assert.equal(configMin.bcryptCost, 4);

    const configMax = loadConfig({ ...validBaseEnv, BCRYPT_COST: '14' });
    assert.equal(configMax.bcryptCost, 14);
  });

  it('invalid BCRYPT_COST throws without leaking the supplied value', () => {
    const badCosts = ['3', '15', 'abc', '4.5', '-1'];
    for (const badCost of badCosts) {
      assert.throws(
        () => loadConfig({ ...validBaseEnv, BCRYPT_COST: badCost }),
        (err) => {
          assert.match(err.message, /BCRYPT_COST/);
          assert.equal(err.message.includes(badCost), false);
          return true;
        }
      );
    }
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
