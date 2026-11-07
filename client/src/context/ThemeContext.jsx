import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  readThemePreference,
  resolveTheme,
  THEME_COLORS,
  THEME_STORAGE_KEY,
} from '../utils/theme.js';

const ThemeContext = createContext(null);
const LIGHT_QUERY = '(prefers-color-scheme: light)';

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Holds the theme choice (system, light or dark), saves it, and applies the resulting theme to
 * <html data-theme="...">, which switches the design tokens in index.css.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(() => readThemePreference(getStorage()));
  const [systemLight, setSystemLight] = useState(() => window.matchMedia(LIGHT_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(LIGHT_QUERY);
    const onChange = (e) => setSystemLight(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const theme = resolveTheme(preference, systemLight);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  }, [theme]);

  const setPreference = useCallback((next) => {
    setPreferenceState(next);
    try {
      getStorage()?.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Saving is a convenience; the choice still applies for this visit.
    }
  }, []);

  const toggle = useCallback(
    () => setPreference(theme === 'dark' ? 'light' : 'dark'),
    [theme, setPreference]
  );

  const value = useMemo(
    () => ({ preference, theme, setPreference, toggle }),
    [preference, theme, setPreference, toggle]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
