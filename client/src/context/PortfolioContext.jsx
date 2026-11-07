import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tradingApi } from '../api/trading.js';

const PortfolioContext = createContext(null);
const RECENT_ORDER_LIMIT = 6;

/**
 * Loads the signed-in user's summary, holdings and recent orders, and exposes
 * refresh() to reload them after a trade. Mount only while authenticated.
 * Status is 'loading' until the first load, then 'ready' or 'error'.
 */
export function PortfolioProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', summary: null, holdings: [], orders: [] });

  const load = useCallback(async (signal) => {
    const [summary, holdings, orders] = await Promise.all([
      tradingApi.summary(signal),
      tradingApi.holdings(signal),
      tradingApi.orders(RECENT_ORDER_LIMIT, signal),
    ]);
    setState({
      status: 'ready',
      summary: summary.summary,
      holdings: holdings.holdings,
      orders: orders.orders,
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((err) => {
      if (err.name === 'AbortError') return;
      setState((prev) => ({ ...prev, status: 'error' }));
    });
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);
  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within a PortfolioProvider');
  return ctx;
}
