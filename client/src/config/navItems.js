import { LayoutDashboard, PieChart, ListOrdered, Eye, Settings } from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'portfolio', label: 'Portfolio', icon: PieChart, active: false },
  { id: 'orders', label: 'Orders', icon: ListOrdered, active: false },
  { id: 'watchlist', label: 'Watchlist', icon: Eye, active: false },
  { id: 'settings', label: 'Settings', icon: Settings, active: false },
];
