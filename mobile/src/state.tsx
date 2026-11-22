// Who is signed in and how they like to read, saved on the phone.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Lang, Session } from './api';
import { strings, type Strings } from './strings';
import { sizes, type TextStep } from './theme';

export interface Prefs {
  language: Lang;
  textStep: TextStep;
  mode: 'standard' | 'comfort';
}

const DEFAULT_PREFS: Prefs = { language: 'en', textStep: 1, mode: 'comfort' };
const SESSION_KEY = 'aangan.session';
const PREFS_KEY = 'aangan.prefs';

interface AppState {
  ready: boolean;
  session: Session | null;
  prefs: Prefs;
  t: Strings;
  fs: ReturnType<typeof sizes>;
  signIn(session: Session): void;
  signOut(): void;
  setPrefs(patch: Partial<Prefs>): void;
}

const Ctx = createContext<AppState | null>(null);

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  const p = value === null ? AsyncStorage.removeItem(key) : AsyncStorage.setItem(key, JSON.stringify(value));
  p.catch(() => {
    // storage unavailable: they simply sign in again next time
  });
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    void Promise.all([readJson<Session>(SESSION_KEY), readJson<Partial<Prefs>>(PREFS_KEY)]).then(([s, p]) => {
      if (s?.userId && s.authKey) setSession(s);
      if (p) setPrefsState({ ...DEFAULT_PREFS, ...p });
      setReady(true);
    });
  }, []);

  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState((cur) => {
      const next = { ...cur, ...patch };
      write(PREFS_KEY, next);
      return next;
    });
  }, []);

  const signIn = useCallback(
    (s: Session) => {
      setSession(s);
      write(SESSION_KEY, s);
      // A demo persona brings her own way of reading (Dadi: Hindi, Comfort, large text).
      if (s.persona) setPrefs({ language: s.language ?? 'en', mode: s.mode ?? 'comfort', textStep: s.mode === 'comfort' ? 2 : 0 });
    },
    [setPrefs],
  );

  const signOut = useCallback(() => {
    setSession(null);
    write(SESSION_KEY, null);
  }, []);

  const value = useMemo<AppState>(
    () => ({ ready, session, prefs, t: strings(prefs.language), fs: sizes(prefs.textStep), signIn, signOut, setPrefs }),
    [ready, session, prefs, signIn, signOut, setPrefs],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppStateProvider');
  return v;
}
