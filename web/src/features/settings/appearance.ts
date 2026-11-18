import { useSyncExternalStore } from 'react';

// Light / Dark, per browser. Applied as <html data-theme="..."> so every page,
// sheet and dialog picks up the dark tokens in index.css.
export type Theme = 'light' | 'dark';
const KEY = 'aangan.theme';
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme = getTheme()): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // storage blocked: still applies for this visit
  }
  applyTheme(theme);
  listeners.forEach((l) => l());
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getTheme,
  );
  return [theme, setTheme];
}
