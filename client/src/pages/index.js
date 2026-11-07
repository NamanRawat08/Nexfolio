import { DashboardPage } from './DashboardPage.jsx';
import { PortfolioPage } from './PortfolioPage.jsx';
import { OrdersPage } from './OrdersPage.jsx';
import { WatchlistPage } from './WatchlistPage.jsx';
import { SettingsPage } from './SettingsPage.jsx';

/** Page component for each route id in config/navItems.js. */
export const PAGES = {
  dashboard: DashboardPage,
  portfolio: PortfolioPage,
  orders: OrdersPage,
  watchlist: WatchlistPage,
  settings: SettingsPage,
};
