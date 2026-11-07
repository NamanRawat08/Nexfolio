import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tradingApi } from '../api/trading.js';

const WatchlistContext = createContext(null);

/**
 * Loads the signed-in user's watchlist and exposes add/remove, which reload the list
 * afterwards so every consumer (card, search results) stays in step. Mount only while
 * authenticated. Status is 'loading' until the first load, then 'ready' or 'error'.
 */
export function WatchlistProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', items: [] });

  const load = useCallback(async (signal) => {
    const data = await tradingApi.watchlist(signal);
    setState({ status: 'ready', items: data.watchlist });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch((err) => {
      if (err.name === 'AbortError') return;
      setState((prev) => ({ ...prev, status: 'error' }));
    });
    return () => controller.abort();
  }, [load]);

  const add = useCallback(
    async (symbol) => {
      await tradingApi.addToWatchlist(symbol);
      await load();
    },
    [load]
  );

  const remove = useCallback(
    async (symbol) => {
      await tradingApi.removeFromWatchlist(symbol);
      await load();
    },
    [load]
  );

  const symbols = useMemo(() => new Set(state.items.map((i) => i.symbol)), [state.items]);
  const value = useMemo(() => ({ ...state, symbols, add, remove }), [state, symbols, add, remove]);
  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within a WatchlistProvider');
  return ctx;
}
