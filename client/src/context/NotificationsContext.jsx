import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tradingApi } from '../api/trading.js';

const NotificationsContext = createContext(null);
const POLL_MS = 60_000;

/**
 * Loads the signed-in user's notifications and keeps the unread count fresh: on mount, every
 * minute, and whenever the window regains focus. Mount only while authenticated.
 */
export function NotificationsProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', items: [], unreadCount: 0 });

  const load = useCallback(async (signal) => {
    const data = await tradingApi.notifications(signal);
    setState({ status: 'ready', items: data.notifications, unreadCount: data.unreadCount });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const refreshQuietly = () => {
      load(controller.signal).catch((err) => {
        if (err.name === 'AbortError') return;
        setState((prev) => (prev.status === 'ready' ? prev : { ...prev, status: 'error' }));
      });
    };
    refreshQuietly();
    const timer = setInterval(refreshQuietly, POLL_MS);
    window.addEventListener('focus', refreshQuietly);
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('focus', refreshQuietly);
    };
  }, [load]);

  const refresh = useCallback(() => load().catch(() => {}), [load]);

  const markAllRead = useCallback(async () => {
    await tradingApi.markNotificationsRead();
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      unreadCount: 0,
      items: prev.items.map((n) => (n.readAt ? n : { ...n, readAt: now })),
    }));
  }, []);

  const value = useMemo(() => ({ ...state, refresh, markAllRead }), [state, refresh, markAllRead]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}
