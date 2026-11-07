import { useSyncExternalStore } from 'react';
import { NAV_IDS } from '../config/navItems.js';
import { parseRoute } from '../utils/route.js';

function subscribe(onChange) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

/**
 * The current page id, taken from the URL hash (#orders, #settings, ...). Links such as
 * <a href="#orders"> change it without reloading, and the back button works.
 *
 * @returns {string}
 */
export function useHashRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return parseRoute(hash, NAV_IDS);
}
