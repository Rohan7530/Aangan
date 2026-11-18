import { useEffect, useMemo, useState } from 'react';
import { getDemoSession, type DemoPersona, type DemoSession } from '../api';
import { BrandMark } from '../components/BrandMark';
import { Workspace } from '../components/workspace/Workspace';
import { memoryReaderPrefsStore, ReaderPrefsProvider } from '../features/reader-view';

const PERSONAS: DemoPersona[] = ['arjun', 'dadi', 'papa', 'meera'];

// Runs inside one showcase frame (an iframe). Each iframe is its own page, so
// it gets its own Nexconn engine and its own live connection.
//   /showcase/phone?persona=dadi  -> phone frame (opens in the persona's mode)
//   /showcase/app?persona=arjun   -> full three-pane Standard app
export function PhonePage({ forceMode }: { forceMode?: 'standard' | 'comfort' }) {
  const persona = useMemo(() => {
    const p = new URLSearchParams(window.location.search).get('persona');
    return PERSONAS.includes(p as DemoPersona) ? (p as DemoPersona) : 'arjun';
  }, []);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDemoSession(persona)
      .then((s) => !cancelled && setSession(s))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Demo unavailable'));
    return () => {
      cancelled = true;
    };
  }, [persona]);

  const store = useMemo(
    () => (session ? memoryReaderPrefsStore({ mode: forceMode ?? session.mode, textStep: 0, language: session.language ?? 'en' }) : null),
    [session, forceMode],
  );

  if (error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-cream px-8 text-center" role="alert">
        <BrandMark size={56} />
        <p className="font-semibold">{error}</p>
      </div>
    );
  }
  if (!session || !store) {
    return (
      <div className="flex h-dvh items-center justify-center bg-cream" role="status" aria-label="Opening the family room">
        <BrandMark size={56} />
      </div>
    );
  }
  return (
    <ReaderPrefsProvider userId={session.userId} store={store}>
      <Workspace session={session} embedded initialRoom={session.channelId} />
    </ReaderPrefsProvider>
  );
}
