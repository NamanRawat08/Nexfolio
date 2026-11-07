import { LayoutDashboard, PieChart, ListOrdered, Eye, Settings } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'portfolio', label: 'Portfolio', icon: PieChart },
  { id: 'orders', label: 'Orders', icon: ListOrdered },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const NAV_IDS = NAV_ITEMS.map((item) => item.id);
