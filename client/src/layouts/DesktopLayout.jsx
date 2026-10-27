import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Sun,
  ShieldAlert,
} from 'lucide-react';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ApiStatus } from '../features/dashboard/ApiStatus.jsx';
import { PortfolioChart } from '../features/dashboard/PortfolioChart.jsx';
import { WalletCards } from '../features/dashboard/WalletCards.jsx';
import { MonthlyPerformanceChart } from '../features/dashboard/MonthlyPerformanceChart.jsx';
import { RecentOrders } from '../features/dashboard/RecentOrders.jsx';
import { NAV_ITEMS } from '../config/navItems.js';

const STORAGE_KEY = 'nexfolio_sidebar_expanded';

function getInitialExpanded() {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val !== null ? JSON.parse(val) : false; // Collapsed by default (icon rail)
  } catch {
    return false;
  }
}

export function DesktopLayout() {
  const [isExpanded, setIsExpanded] = useState(getInitialExpanded);

  const toggleSidebar = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Safe fallback if localStorage is disabled or quota exceeded
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-bg text-fg flex">
      {/* Slim Vertical Icon Sidebar */}
      <aside
        aria-label="Main Navigation"
        className={`fixed top-0 bottom-0 left-0 z-30 bg-surface border-r border-line flex flex-col justify-between transition-all duration-200 select-none ${
          isExpanded ? 'w-60' : 'w-16'
        }`}
      >
        {/* Top Brand & Toggle */}
        <div>
          <div className="h-16 flex items-center justify-between px-3.5 border-b border-line">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg bg-accent text-accent-fg font-black text-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                N
              </div>
              {isExpanded && (
                <div className="leading-tight truncate">
                  <span className="font-extrabold text-base tracking-tight text-fg block">
                    Nexfolio
                  </span>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-accent block">
                    Simulation
                  </span>
                </div>
              )}
            </div>
            {isExpanded && (
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Collapse sidebar"
                className="p-1 rounded-md text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              if (item.active) {
                return (
                  <a
                    key={item.id}
                    href="#dashboard"
                    aria-current="page"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors bg-accent/15 text-accent border border-accent/20 ${
                      !isExpanded && 'justify-center'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    {isExpanded && <span className="truncate">{item.label}</span>}
                  </a>
                );
              }

              // Non-active items are visibly disabled placeholders
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Coming soon"
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted/60 hover:text-muted cursor-not-allowed transition-colors ${
                    !isExpanded && 'justify-center'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {isExpanded && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-line space-y-2">
          {!isExpanded && (
            <div className="flex justify-center pb-1">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Expand sidebar"
                className="p-2 rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          <div
            className={`flex items-center p-2 rounded-lg bg-surface-2/60 border border-line/50 ${
              isExpanded ? 'justify-start' : 'justify-center'
            }`}
          >
            <ApiStatus showLabel={isExpanded} />
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          isExpanded ? 'ml-60' : 'ml-16'
        }`}
      >
        {/* Top Header */}
        <header className="h-16 sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-line px-6 flex items-center justify-between gap-4">
          {/* Global Search Input (Visual Placeholder) */}
          <div className="flex-1 max-w-md">
            {/* TODO(feature): wire up global instrument search */}
            <div className="relative">
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                type="text"
                disabled
                aria-disabled="true"
                aria-label="Search instruments"
                title="Search not available yet"
                placeholder="Search instruments (e.g. RELIANCE, TCS)"
                className="w-full bg-surface-2/80 text-fg text-sm pl-9 pr-4 py-2 rounded-lg border border-line focus:outline-none placeholder:text-muted/60 disabled:cursor-not-allowed disabled:opacity-60 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Persistent Simulated Data Badge */}
            <Badge variant="accent" className="inline-flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Simulated data</span>
            </Badge>

            {/* Workspace Switcher Pill (Visual Placeholder) */}
            {/* TODO(feature): wire up workspace switcher */}
            <div
              title="Workspace switching not available yet"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-line text-xs font-semibold text-fg select-none"
            >
              <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
              <span>Simulation</span>
            </div>

            {/* Notification Button (Placeholder) */}
            {/* TODO(feature): wire up notification drawer */}
            <Button
              variant="outline"
              size="icon"
              disabled
              title="Notifications not available yet"
              aria-label="Notifications"
              className="text-muted"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
            </Button>

            {/* Theme Toggle (Placeholder) */}
            {/* TODO(feature): light theme support */}
            <Button
              variant="outline"
              size="icon"
              disabled
              title="Light theme not available yet"
              aria-label="Toggle theme"
              className="text-muted"
            >
              <Sun className="w-4 h-4" aria-hidden="true" />
            </Button>

            {/* User Profile Card */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-line">
              <Avatar initials="DU" size="md" ariaLabel="Demo User profile" />
              <div className="text-left block leading-tight">
                <span className="text-xs font-bold text-fg block">Demo User</span>
                <span className="text-[11px] text-muted block">Paper Trader</span>
              </div>
            </div>
          </div>
        </header>

        {/* 12-Column Grid Main Content */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Row 1: Portfolio Chart (8 cols) + Wallet Cards (4 cols) */}
          <div className="grid grid-cols-12 gap-6 items-stretch">
            <div className="col-span-8 flex flex-col">
              <PortfolioChart compact={false} />
            </div>
            <div className="col-span-4 flex flex-col">
              <WalletCards compact={false} />
            </div>
          </div>

          {/* Row 2: Monthly Performance (7 cols) + Recent Orders (5 cols) */}
          <div className="grid grid-cols-12 gap-6 items-stretch">
            <div className="col-span-7 flex flex-col">
              <MonthlyPerformanceChart compact={false} />
            </div>
            <div className="col-span-5 flex flex-col">
              <RecentOrders />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
