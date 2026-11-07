import React from 'react';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { DesktopLayout } from './layouts/DesktopLayout.jsx';
import { MobileLayout } from './layouts/MobileLayout.jsx';
import { AuthPage } from './features/auth/AuthPage.jsx';
import { PortfolioProvider } from './context/PortfolioContext.jsx';
import { WatchlistProvider } from './context/WatchlistContext.jsx';
import { useAuth } from './context/AuthContext.jsx';

/**
 * Root Application Component.
 * Dynamically mounts DesktopLayout (>=1024px) or MobileLayout (<1024px)
 * using useSyncExternalStore via useMediaQuery.
 * Only one layout is mounted in the DOM at any time.
 * Anonymous visitors see the sign-in screen instead of the dashboard.
 */
function App() {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className="min-h-[100dvh] bg-bg flex items-center justify-center text-muted text-sm" role="status">
        Loading…
      </div>
    );
  }
  if (status === 'anonymous') return <AuthPage />;

  return (
    <PortfolioProvider>
      <WatchlistProvider>
        {isDesktop ? <DesktopLayout /> : <MobileLayout />}
      </WatchlistProvider>
    </PortfolioProvider>
  );
}

export default App;
