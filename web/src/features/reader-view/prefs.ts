// How one person reads. Stored per user behind a small interface so the
// storage can move from localStorage to Nexconn (e.g. user profile extProfile)
// later without touching any component.

export type ReaderMode = 'standard' | 'comfort';
export type TextStep = 0 | 1 | 2;

export interface ReaderPrefs {
  mode: ReaderMode;
  textStep: TextStep;
}

export const DEFAULT_READER_PREFS: ReaderPrefs = { mode: 'standard', textStep: 0 };

export const TEXT_STEP_LABELS: Record<TextStep, string> = {
  0: 'Regular',
  1: 'Large',
  2: 'Largest',
};

export interface ReaderPrefsStore {
  /** Optional synchronous read, used to render the first frame without a flash. */
  peek?(userId: string): ReaderPrefs | null;
  load(userId: string): Promise<ReaderPrefs | null>;
  save(userId: string, prefs: ReaderPrefs): Promise<void>;
}

function parse(raw: string | null): ReaderPrefs | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ReaderPrefs>;
    const mode = v.mode === 'comfort' || v.mode === 'standard' ? v.mode : null;
    const step = v.textStep === 0 || v.textStep === 1 || v.textStep === 2 ? v.textStep : null;
    return mode !== null && step !== null ? { mode, textStep: step } : null;
  } catch {
    return null;
  }
}

const keyFor = (userId: string) => `aangan.reader.${userId}`;

function peekLocal(userId: string): ReaderPrefs | null {
  try {
    return parse(localStorage.getItem(keyFor(userId)));
  } catch {
    return null; // storage blocked: fall back to defaults
  }
}

export const localReaderPrefsStore: ReaderPrefsStore = {
  peek: peekLocal,
  async load(userId) {
    return peekLocal(userId);
  },
  async save(userId, prefs) {
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(prefs));
    } catch {
      // storage blocked: the choice simply won't survive a refresh
    }
  },
};

// In-memory store (no persistence): the showcase phones open in a fixed mode
// and must not overwrite a real user's saved choice in this browser.
export function memoryReaderPrefsStore(initial: ReaderPrefs): ReaderPrefsStore {
  const saved = new Map<string, ReaderPrefs>();
  return {
    peek: (userId) => saved.get(userId) ?? initial,
    load: async (userId) => saved.get(userId) ?? initial,
    save: async (userId, prefs) => {
      saved.set(userId, prefs);
    },
  };
}
