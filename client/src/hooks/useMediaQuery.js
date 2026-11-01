import { useSyncExternalStore } from 'react';

// Module-level cache storing stable subscribe and getSnapshot functions per query.
// Ensures stable function identities across re-renders without redundant re-subscriptions.
const queryStoreCache = new Map();

function getOrCreateQueryStore(query) {
  let store = queryStoreCache.get(query);
  if (!store) {
    const mql = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null;
    store = {
      subscribe: (callback) => {
        if (!mql) return () => {};
        mql.addEventListener('change', callback);
        return () => mql.removeEventListener('change', callback);
      },
      getSnapshot: () => (mql ? mql.matches : false),
      getServerSnapshot: () => false,
    };
    queryStoreCache.set(query, store);
  }
  return store;
}

/**
 * React hook that tracks a CSS media query using useSyncExternalStore.
 * Returns a boolean indicating whether the query currently matches.
 *
 * Uses stable subscribe and getSnapshot functions per query so that
 * re-renders of the calling component do not re-attach listeners.
 *
 * @param {string} query — a CSS media query string, e.g. '(min-width: 1024px)'
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const store = getOrCreateQueryStore(query);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
