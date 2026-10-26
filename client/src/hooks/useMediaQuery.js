import { useSyncExternalStore } from 'react';

/**
 * React hook that tracks a CSS media query using useSyncExternalStore.
 * Returns a boolean indicating whether the query currently matches.
 *
 * Uses a synchronous initial snapshot (via window.matchMedia) so there
 * is no layout flash between server/client or between renders.
 *
 * @param {string} query — a CSS media query string, e.g. '(min-width: 1024px)'
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const subscribe = (callback) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', callback);
    return () => mql.removeEventListener('change', callback);
  };

  const getSnapshot = () => window.matchMedia(query).matches;

  // SSR fallback — not used in this SPA but required by the API
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
