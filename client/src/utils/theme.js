export const THEME_STORAGE_KEY = 'nexfolio_theme';
export const THEME_PREFERENCES = Object.freeze(['system', 'light', 'dark']);

/**
 * Reads the saved theme preference; anything missing or unrecognized means 'system'.
 *
 * @param {{ getItem: (key: string) => string | null }} [storage]
 * @returns {'system' | 'light' | 'dark'}
 */
export function readThemePreference(storage) {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return THEME_PREFERENCES.includes(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Turns a preference into the theme to show.
 *
 * @param {'system' | 'light' | 'dark'} preference
 * @param {boolean} systemPrefersLight
 * @returns {'light' | 'dark'}
 */
export function resolveTheme(preference, systemPrefersLight) {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemPrefersLight ? 'light' : 'dark';
}

/** Browser chrome colors that match each theme (used for <meta name="theme-color">). */
export const THEME_COLORS = Object.freeze({ dark: '#0a0e17', light: '#f5f2ec' });
