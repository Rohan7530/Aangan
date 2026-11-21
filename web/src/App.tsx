import { useCallback, useEffect, useState } from 'react';
import { getRoomConfig } from './api';
import { BrandMark } from './components/BrandMark';
import { Workspace } from './components/workspace/Workspace';
import { ReaderPrefsProvider } from './features/reader-view';
import { JoinPage } from './pages/JoinPage';
import { PhonePage } from './pages/PhonePage';
import { ShowcasePage } from './pages/ShowcasePage';
import { WelcomePage } from './pages/WelcomePage';
import { clearSession, forgetOtherRooms, listSavedSessions, loadSession, saveSession, type Session } from './session';

type Boot = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

// Tiny path router.
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/showcase') return <ShowcasePage />;
  if (path === '/showcase/phone') return <PhonePage />;
  if (path === '/showcase/app') return <PhonePage forceMode="standard" />;
  const join = path.match(/^\/join\/([a-z0-9]{4,32})$/i);
  if (join) return <JoinPage code={join[1]} />;
  return <FamilyApp />;
}

function FamilyApp() {
  const [boot, setBoot] = useState<Boot>({ status: 'loading' });
  const [session, setSession] = useState<Session | null>(null);
  const [saved, setSaved] = useState<Session[]>([]);

  // Ask the server which family room is current, and drop sessions saved for an older one.
  useEffect(() => {
    let cancelled = false;
    getRoomConfig()
      .then((room) => {
        if (cancelled) return;
        forgetOtherRooms(room.channelId);
        setSession(loadSession());
        setSaved(listSavedSessions());
        setBoot({ status: 'ready' });
      })
      .catch(() => !cancelled && setBoot({ status: 'error', message: 'Aangan cannot reach its server right now.' }));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoggedIn = useCallback((s: Session) => {
    saveSession(s);
    setSession(s);
  }, []);

  const handleLogout = useCallback(() => {
    setSession((current) => {
      clearSession(current?.userId);
      return null;
    });
    setSaved(listSavedSessions());
  }, []);

  if (boot.status === 'loading') {
    return (
      <div className="flex min-h-full items-center justify-center" role="status" aria-label="Loading Aangan">
        <BrandMark size={64} />
      </div>
    );
  }
  if (boot.status === 'error') {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-8 text-center" role="alert">
        <BrandMark size={64} />
        <p className="text-[1.25rem] font-semibold">{boot.message}</p>
        <p className="text-ink-muted">Please check that the server is running, then reload.</p>
      </div>
    );
  }
  if (!session) {
    // First visit (no saved family on this device): show the story first.
    // The landing page's buttons come back here with ?start=1.
    const fresh = saved.length === 0 && !new URLSearchParams(window.location.search).has('start');
    if (fresh && window.location.pathname === '/') {
      window.location.replace('/welcome.html');
      return null;
    }
    return <WelcomePage savedSessions={saved} onLoggedIn={handleLoggedIn} />;
  }
  return (
    <ReaderPrefsProvider key={session.userId} userId={session.userId}>
      <Workspace session={session} onLogout={handleLogout} />
    </ReaderPrefsProvider>
  );
}
