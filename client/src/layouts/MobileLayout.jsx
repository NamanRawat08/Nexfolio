import React, { useState } from 'react';
import { Search, Bell, ShieldAlert, LogOut } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ApiStatus } from '../features/dashboard/ApiStatus.jsx';
import { InstrumentSearch } from '../features/trading/InstrumentSearch.jsx';
import { useHashRoute } from '../hooks/useHashRoute.js';
import { PAGES } from '../pages/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getInitials } from '../utils/user.js';
import { NAV_ITEMS } from '../config/navItems.js';

export function MobileLayout() {
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const route = useHashRoute();
  const Page = PAGES[route];
  return (
    <div className="min-h-[100dvh] bg-bg text-fg flex flex-col overflow-x-hidden">
      {/* Sticky Compact Top Header */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-line px-4 h-14 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent text-accent-fg font-black text-base flex items-center justify-center shrink-0 shadow-sm">
            N
          </div>
          <span className="font-extrabold text-base tracking-tight text-fg">
            Nexfolio
          </span>
          <Badge variant="accent" className="text-[10px] py-0 px-1.5 ml-1">
            SIM
          </Badge>
        </div>

        {/* Right Header Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Search */}
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-label={searchOpen ? 'Close search' : 'Search instruments'}
            aria-expanded={searchOpen}
            className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:text-fg cursor-pointer"
          >
            <Search className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Notifications Placeholder */}
          {/* TODO(feature): wire up notifications */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label="Notifications"
            title="Notifications not available yet"
            className="w-11 h-11 flex items-center justify-center rounded-lg text-muted/50 cursor-not-allowed"
          >
            <Bell className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* User Profile Avatar */}
          <div className="pl-1">
            <Avatar
              initials={getInitials(user.username)}
              size="sm"
              ariaLabel={`${user.username} avatar`}
            />
          </div>

          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="w-11 h-11 flex items-center justify-center rounded-lg text-muted hover:text-fg cursor-pointer"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="sticky top-14 z-20 border-b border-line bg-surface px-4 py-2">
          <InstrumentSearch autoFocus />
        </div>
      )}

      {/* Simulated Notice & API Status Banner */}
      <div className="bg-surface-2/60 border-b border-line/60 px-4 py-1.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-accent font-medium">
          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="text-[11px]">Simulated Data</span>
        </div>
        <ApiStatus showLabel={true} />
      </div>

      {/* Single-Column Main Content Stack */}
      <main className="flex-1 p-4 pb-24 space-y-4 max-w-full">
        <Page compact />
      </main>

      {/* Fixed Bottom Tab Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line px-2 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const current = item.id === route;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                aria-current={current ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] select-none ${
                  current ? 'text-accent' : 'text-muted hover:text-fg'
                }`}
              >
                <Icon className="w-5 h-5 mb-0.5" aria-hidden="true" />
                <span className={`text-[10px] tracking-tight ${current ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
