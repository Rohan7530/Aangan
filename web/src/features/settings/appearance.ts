import { useSyncExternalStore } from 'react';

// Appearance: Light, Dark or System (follows the device), per browser.
// The resolved theme is applied as <html data-theme="light|dark"> so every page,
// sheet and pop-up picks up the dark tokens in index.css.
export type ThemePref = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

const KEY = 'aangan.theme';
const listeners = new Set<() => void>();
const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(pref: ThemePref = getThemePref()): Theme {
  if (pref === 'system') return media?.matches ? 'dark' : 'light';
  return pref;
}

export function applyTheme(): void {
  const theme = resolveTheme();
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

// Follow the device while on "System".
media?.addEventListener?.('change', () => {
  if (getThemePref() === 'system') {
    applyTheme();
    listeners.forEach((l) => l());
  }
});

export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // storage blocked: still applies for this visit
  }
  applyTheme();
  listeners.forEach((l) => l());
}

export function useThemePref(): [ThemePref, (t: ThemePref) => void] {
  const pref = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getThemePref,
  );
  return [pref, setThemePref];
}
