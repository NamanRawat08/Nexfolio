import React, { useEffect } from 'react';
import { useMediaQuery } from './hooks/useMediaQuery.js';
import { DesktopLayout } from './layouts/DesktopLayout.jsx';
import { MobileLayout } from './layouts/MobileLayout.jsx';
import { AuthPage } from './features/auth/AuthPage.jsx';
import { PortfolioProvider } from './context/PortfolioContext.jsx';
import { WatchlistProvider } from './context/WatchlistContext.jsx';
import { NotificationsProvider } from './context/NotificationsContext.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import { NAV_ITEMS } from './config/navItems.js';
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
  const route = useHashRoute();

  useEffect(() => {
    const label = NAV_ITEMS.find((item) => item.id === route)?.label ?? 'Dashboard';
    document.title = `${label} — Nexfolio`;
    window.scrollTo(0, 0);
  }, [route]);

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
        <NotificationsProvider>
          {isDesktop ? <DesktopLayout /> : <MobileLayout />}
        </NotificationsProvider>
      </WatchlistProvider>
    </PortfolioProvider>
  );
}

export default App;
