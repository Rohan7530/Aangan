import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_READER_PREFS, localReaderPrefsStore, type ReaderPrefs, type ReaderPrefsStore } from './prefs';

interface ReaderPrefsValue {
  prefs: ReaderPrefs;
  setPrefs: (patch: Partial<ReaderPrefs>) => void;
}

const ReaderPrefsCtx = createContext<ReaderPrefsValue | null>(null);

export function ReaderPrefsProvider({
  userId,
  store = localReaderPrefsStore,
  children,
}: {
  userId: string;
  store?: ReaderPrefsStore;
  children: ReactNode;
}) {
  const [prefs, setState] = useState<ReaderPrefs>(() => store.peek?.(userId) ?? DEFAULT_READER_PREFS);

  // Async load covers stores without a synchronous peek (e.g. a future Nexconn store).
  useEffect(() => {
    let cancelled = false;
    store.load(userId).then((loaded) => {
      if (!cancelled && loaded) setState(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, store]);

  const setPrefs = useCallback(
    (patch: Partial<ReaderPrefs>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        void store.save(userId, next);
        return next;
      });
    },
    [userId, store],
  );

  const value = useMemo(() => ({ prefs, setPrefs }), [prefs, setPrefs]);
  return <ReaderPrefsCtx.Provider value={value}>{children}</ReaderPrefsCtx.Provider>;
}

export function useReaderPrefs(): ReaderPrefsValue {
  const ctx = useContext(ReaderPrefsCtx);
  if (!ctx) throw new Error('useReaderPrefs must be used inside <ReaderPrefsProvider>');
  return ctx;
}
