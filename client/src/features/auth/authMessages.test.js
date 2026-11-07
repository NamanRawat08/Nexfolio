import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { friendlyAuthError, validateRegistration } from './authMessages.js';

describe('validateRegistration', () => {
  const ok = { username: 'good_name', password: 'longenough1' };

  it('accepts valid input', () => {
    assert.equal(validateRegistration(ok), '');
  });

  it('explains a short password in plain words', () => {
    assert.match(validateRegistration({ ...ok, password: 'short' }), /too short.*at least 8 characters/i);
  });

  it('explains a long password in plain words, counting bytes like the server', () => {
    assert.match(validateRegistration({ ...ok, password: 'a'.repeat(73) }), /too long.*72 characters/i);
    assert.equal(validateRegistration({ ...ok, password: 'a'.repeat(72) }), '');
    assert.match(validateRegistration({ ...ok, password: '€'.repeat(25) }), /too long/i); // 75 bytes
  });

  it('explains username rules', () => {
    for (const username of ['ab', 'has space', 'x'.repeat(31), 'bad-char']) {
      assert.match(validateRegistration({ ...ok, username }), /3 to 30 characters.*letters, numbers and underscores/i);
    }
  });
});

describe('friendlyAuthError', () => {
  it('maps known codes', () => {
    assert.match(friendlyAuthError({ code: 'EMAIL_TAKEN' }), /already registered/i);
    assert.match(friendlyAuthError({ code: 'USERNAME_TAKEN' }), /already taken/i);
    assert.match(friendlyAuthError({ code: 'RATE_LIMITED' }), /wait a few minutes/i);
    assert.equal(friendlyAuthError({ code: 'INVALID_CREDENTIALS' }), 'Incorrect email/username or password.');
  });

  it('rewrites the server\'s technical validation messages', () => {
    const v = (message) => friendlyAuthError({ code: 'VALIDATION_ERROR', message });
    assert.match(v('Password must be between 8 and 72 bytes'), /too short.*8 characters/i);
    assert.match(v('Username must be between 3 and 30 characters and contain only letters, numbers, and underscores'), /usernames must be/i);
    assert.match(v('Email must contain exactly one @ symbol'), /valid email address/i);
    assert.match(v('Invalid email format'), /valid email address/i);
    assert.equal(v('Password is required and must not exceed 72 bytes'), 'Incorrect email/username or password.');
  });

  it('never shows the word "bytes"', () => {
    for (const message of ['Password must be between 8 and 72 bytes', 'Password is required and must not exceed 72 bytes']) {
      assert.doesNotMatch(friendlyAuthError({ code: 'VALIDATION_ERROR', message }), /bytes/i);
    }
  });

  it('falls back to the server message, then a generic one', () => {
    assert.equal(friendlyAuthError({ code: 'WEIRD', message: 'Custom text' }), 'Custom text');
    assert.match(friendlyAuthError({}), /something went wrong/i);
    assert.match(friendlyAuthError(undefined), /something went wrong/i);
  });
});
