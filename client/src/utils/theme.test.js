import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readThemePreference, resolveTheme, THEME_STORAGE_KEY } from './theme.js';

const storageWith = (value) => ({ getItem: (key) => (key === THEME_STORAGE_KEY ? value : null) });

describe('readThemePreference', () => {
  it('returns a saved valid preference', () => {
    for (const v of ['system', 'light', 'dark']) assert.equal(readThemePreference(storageWith(v)), v);
  });

  it('falls back to system for missing, unknown or unreadable values', () => {
    assert.equal(readThemePreference(storageWith(null)), 'system');
    assert.equal(readThemePreference(storageWith('purple')), 'system');
    assert.equal(readThemePreference(undefined), 'system');
    assert.equal(readThemePreference({ getItem() { throw new Error('blocked'); } }), 'system');
  });
});

describe('resolveTheme', () => {
  it('uses an explicit choice as is', () => {
    assert.equal(resolveTheme('light', false), 'light');
    assert.equal(resolveTheme('dark', true), 'dark');
  });

  it('follows the system when the preference is system', () => {
    assert.equal(resolveTheme('system', true), 'light');
    assert.equal(resolveTheme('system', false), 'dark');
  });
});
