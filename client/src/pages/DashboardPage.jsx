import React from 'react';
import { PortfolioChart } from '../features/dashboard/PortfolioChart.jsx';
import { WalletCards } from '../features/dashboard/WalletCards.jsx';
import { MonthlyPerformanceChart } from '../features/dashboard/MonthlyPerformanceChart.jsx';
import { OpenOrdersCard } from '../features/dashboard/OpenOrdersCard.jsx';
import { WatchlistCard } from '../features/dashboard/WatchlistCard.jsx';
import { HoldingsCard } from '../features/dashboard/HoldingsCard.jsx';
import { RecentOrders } from '../features/dashboard/RecentOrders.jsx';

/**
 * The overview page. `compact` is true in the mobile layout (single column, fewer chart ticks).
 *
 * @param {{ compact: boolean }} props
 */
export function DashboardPage({ compact }) {
  const heading = <h1 className="sr-only">Dashboard</h1>;

  if (compact) {
    return (
      <>
        {heading}
        <section aria-label="Portfolio Performance">
          <PortfolioChart compact />
        </section>
        <section aria-label="Simulated Wallets">
          <WalletCards compact />
        </section>
        <section aria-label="Monthly Performance Breakdown">
          <MonthlyPerformanceChart compact />
        </section>
        <section aria-label="Holdings">
          <HoldingsCard />
        </section>
        <section aria-label="Open Orders">
          <OpenOrdersCard />
        </section>
        <section aria-label="Watchlist">
          <WatchlistCard />
        </section>
        <section aria-label="Recent Simulated Orders">
          <RecentOrders />
        </section>
      </>
    );
  }

  return (
    <>
      {heading}
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

      {/* Row 3: Holdings (7 cols) + Watchlist (5 cols) */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        <div className="col-span-7 flex flex-col">
          <HoldingsCard />
        </div>
        <div className="col-span-5 flex flex-col">
          <WatchlistCard />
        </div>
      </div>

      {/* Row 4: Open limit orders */}
      <OpenOrdersCard />
    </>
  );
}
