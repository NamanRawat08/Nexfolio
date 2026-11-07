import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.js';

const AuthContext = createContext(null);

/**
 * Holds the signed-in user. Status is 'loading' until the initial /me check
 * finishes, then 'authenticated' or 'anonymous'.
 */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  useEffect(() => {
    const controller = new AbortController();
    authApi
      .me(controller.signal)
      .then((data) => setState({ status: 'authenticated', user: data.user }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({ status: 'anonymous', user: null });
      });
    return () => controller.abort();
  }, []);

  const login = useCallback(async (identifier, password) => {
    const data = await authApi.login(identifier, password);
    setState({ status: 'authenticated', user: data.user });
  }, []);

  // Registration does not start a session on the server, so sign in right after.
  const register = useCallback(async (email, username, password) => {
    await authApi.register(email, username, password);
    const data = await authApi.login(email, password);
    setState({ status: 'authenticated', user: data.user });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Session may already be invalid; clear local state regardless
    }
    setState({ status: 'anonymous', user: null });
  }, []);

  const value = useMemo(() => ({ ...state, login, register, logout }), [state, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
