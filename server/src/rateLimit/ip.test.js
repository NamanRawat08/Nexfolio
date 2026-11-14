import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIp } from './ip.js';

describe('normalizeIp', () => {
  it('keeps IPv4 as is and unwraps IPv4-mapped IPv6', () => {
    assert.equal(normalizeIp('203.0.113.7'), '203.0.113.7');
    assert.equal(normalizeIp('::ffff:203.0.113.7'), '203.0.113.7');
    assert.equal(normalizeIp('::FFFF:203.0.113.7'), '203.0.113.7');
  });

  it('reduces IPv6 to its /64 so rotating addresses inside one network share a limit', () => {
    const a = normalizeIp('2001:db8:1234:5678:aaaa:bbbb:cccc:dddd');
    const b = normalizeIp('2001:db8:1234:5678::1');
    assert.equal(a, '2001:db8:1234:5678::/64');
    assert.equal(a, b);
    assert.notEqual(a, normalizeIp('2001:db8:1234:5679::1'));
  });

  it('expands :: correctly, including loopback, all-zero, leading and trailing forms', () => {
    assert.equal(normalizeIp('::1'), '0:0:0:0::/64');
    assert.equal(normalizeIp('::'), '0:0:0:0::/64');
    assert.equal(normalizeIp('2001:db8::'), '2001:db8:0:0::/64');
    assert.equal(normalizeIp('2001:0db8:0000:0000:0000:0000:0000:0001'), '2001:db8:0:0::/64');
    assert.equal(normalizeIp('fe80::1%en0'), 'fe80:0:0:0::/64');
  });

  it('returns "unknown" for missing or invalid values', () => {
    for (const v of [undefined, null, '', 'not an ip', '999.1.1.1', 5]) assert.equal(normalizeIp(v), 'unknown');
  });
});
