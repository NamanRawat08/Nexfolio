/**
 * Two-letter uppercase initials for an avatar, from the username.
 *
 * @param {string} username
 * @returns {string}
 */
export function getInitials(username) {
  const cleaned = String(username ?? '').replace(/[^A-Za-z0-9]/g, '');
  return (cleaned.slice(0, 2) || '?').toUpperCase();
}
