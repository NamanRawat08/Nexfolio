export const DEFAULT_ROUTE = 'dashboard';

/**
 * Reads the page id from a URL hash such as '#orders'. Unknown or empty hashes fall back to the
 * default route, so a bad link never shows a blank page.
 *
 * @param {string} hash
 * @param {string[]} validIds
 * @returns {string}
 */
export function parseRoute(hash, validIds) {
  const id = String(hash ?? '').replace(/^#\/?/, '').split(/[?&]/)[0].toLowerCase();
  return validIds.includes(id) ? id : DEFAULT_ROUTE;
}
