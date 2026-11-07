import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// The badge helper is the only pure logic in the bell; import it without loading React UI code.
const { badgeText } = await import('./badgeText.js');

describe('badgeText', () => {
  it('shows the count up to 9, then 9+', () => {
    assert.equal(badgeText(1), '1');
    assert.equal(badgeText(9), '9');
    assert.equal(badgeText(10), '9+');
    assert.equal(badgeText(250), '9+');
  });
});
