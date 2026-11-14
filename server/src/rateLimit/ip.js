import { isIPv4, isIPv6 } from 'node:net';

/**
 * Turns a client IP into the key to limit by. IPv4 is used as is. An IPv6 address is reduced to
 * its /64 network, because one household or host usually owns a whole /64 (2^64 addresses) and
 * limiting single addresses would let a client rotate through them. IPv4-mapped IPv6 addresses
 * (::ffff:1.2.3.4) are treated as the IPv4 address.
 *
 * @param {string | undefined} ip
 * @returns {string}
 */
export function normalizeIp(ip) {
  if (typeof ip !== 'string' || ip === '') return 'unknown';

  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped && isIPv4(mapped[1])) return mapped[1];

  if (isIPv4(ip)) return ip;
  if (!isIPv6(ip)) return 'unknown';

  const address = ip.split('%')[0].toLowerCase(); // drop a zone id such as %en0
  const [head, tail] = address.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail === undefined ? [] : tail ? tail.split(':') : [];
  const missing = 8 - headGroups.length - tailGroups.length;
  const groups = [...headGroups, ...(tail === undefined ? [] : Array(missing).fill('0')), ...tailGroups];
  return `${groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}
