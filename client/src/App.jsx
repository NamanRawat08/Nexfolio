import React from 'react';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { DesktopLayout } from './layouts/DesktopLayout.jsx';
import { MobileLayout } from './layouts/MobileLayout.jsx';

/**
 * Root Application Component.
 * Dynamically mounts DesktopLayout (>=1024px) or MobileLayout (<1024px)
 * using useSyncExternalStore via useMediaQuery.
 * Only one layout is mounted in the DOM at any time.
 */
function App() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return isDesktop ? <DesktopLayout /> : <MobileLayout />;
}

export default App;
