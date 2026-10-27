import React from 'react';
import { Search, Bell, ShieldAlert } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ApiStatus } from '../features/dashboard/ApiStatus.jsx';
import { PortfolioChart } from '../features/dashboard/PortfolioChart.jsx';
import { WalletCards } from '../features/dashboard/WalletCards.jsx';
import { MonthlyPerformanceChart } from '../features/dashboard/MonthlyPerformanceChart.jsx';
import { RecentOrders } from '../features/dashboard/RecentOrders.jsx';
import { NAV_ITEMS } from '../config/navItems.js';

export function MobileLayout() {
  return (
    <div className="min-h-[100dvh] bg-bg text-fg flex flex-col overflow-x-hidden">
      {/* Sticky Compact Top Header */}
      <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-line px-4 h-14 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent text-accent-fg font-black text-base flex items-center justify-center flex-shrink-0 shadow-sm">
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
          {/* Search Placeholder */}
          {/* TODO(feature): wire up search */}
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label="Search instruments"
            title="Search not available yet"
            className="w-11 h-11 flex items-center justify-center rounded-lg text-muted/50 cursor-not-allowed"
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
            <Avatar initials="DU" size="sm" ariaLabel="Demo User avatar" />
          </div>
        </div>
      </header>

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
        {/* 1. Portfolio Chart */}
        <section aria-label="Portfolio Performance">
          <PortfolioChart compact={true} />
        </section>

        {/* 2. Wallet Cards Snap Carousel */}
        <section aria-label="Simulated Wallets">
          <WalletCards compact={true} />
        </section>

        {/* 3. Monthly Performance */}
        <section aria-label="Monthly Performance Breakdown">
          <MonthlyPerformanceChart compact={true} />
        </section>

        {/* 4. Recent Orders */}
        <section aria-label="Recent Simulated Orders">
          <RecentOrders />
        </section>
      </main>

      {/* Fixed Bottom Tab Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line px-2 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center justify-around h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            if (item.active) {
              return (
                <a
                  key={item.id}
                  href="#dashboard"
                  aria-current="page"
                  className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-accent select-none"
                >
                  <Icon className="w-5 h-5 mb-0.5" aria-hidden="true" />
                  <span className="text-[10px] font-bold tracking-tight">
                    {item.label}
                  </span>
                </a>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                disabled
                aria-disabled="true"
                title="Coming soon"
                className="flex flex-col items-center justify-center min-w-[56px] min-h-[44px] text-muted/50 cursor-not-allowed select-none"
              >
                <Icon className="w-5 h-5 mb-0.5" aria-hidden="true" />
                <span className="text-[10px] font-medium tracking-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
