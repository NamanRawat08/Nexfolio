import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute } from './route.js';

const ids = ['dashboard', 'portfolio', 'orders', 'watchlist', 'settings'];

describe('parseRoute', () => {
  it('reads known pages from the hash', () => {
    assert.equal(parseRoute('#orders', ids), 'orders');
    assert.equal(parseRoute('#/settings', ids), 'settings');
    assert.equal(parseRoute('#Portfolio', ids), 'portfolio');
    assert.equal(parseRoute('#orders?tab=open', ids), 'orders');
  });

  it('falls back to the dashboard for empty, unknown or odd hashes', () => {
    for (const hash of ['', '#', '#nope', '#__proto__', '#constructor', undefined, null, '#../etc']) {
      assert.equal(parseRoute(hash, ids), 'dashboard');
    }
  });
});
