import { useEffect, useMemo, useState } from 'react';
import { getDemoSession, type DemoPersona, type DemoSession } from '../api';
import { BrandMark } from '../components/BrandMark';
import { memoryReaderPrefsStore, ReaderPrefsProvider } from '../features/reader-view';
import { ChatPage } from './ChatPage';

const PERSONAS: DemoPersona[] = ['arjun', 'dadi', 'papa', 'meera'];

// Runs inside one showcase phone frame (an iframe). Each iframe is its own
// page, so it gets its own Nexconn engine and its own live connection.
export function PhonePage() {
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
    () => (session ? memoryReaderPrefsStore({ mode: session.mode, textStep: 0 }) : null),
    [session],
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
    <div className="flex h-dvh flex-col bg-cream">
      <ReaderPrefsProvider userId={session.userId} store={store}>
        <ChatPage session={session} embedded />
      </ReaderPrefsProvider>
    </div>
  );
}
