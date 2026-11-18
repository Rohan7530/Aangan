import { useCallback, useEffect, useState } from 'react';
import { getRoomConfig } from './api';
import { BrandMark } from './components/BrandMark';
import { Workspace } from './components/workspace/Workspace';
import { ReaderPrefsProvider } from './features/reader-view';
import { JoinPage } from './pages/JoinPage';
import { PhonePage } from './pages/PhonePage';
import { ShowcasePage } from './pages/ShowcasePage';
import { WelcomePage } from './pages/WelcomePage';
import { clearSession, listIdentities, loadSession, saveSession, type Identity, type Session } from './session';

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
  const [known, setKnown] = useState<Identity[]>([]);

  // Ask the server which family room is current, and drop sessions saved for an older one.
  useEffect(() => {
    let cancelled = false;
    getRoomConfig()
      .then((room) => {
        if (cancelled) return;
        setSession(loadSession(room.channelId));
        setKnown(listIdentities());
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

  // Sign out: forget the session; unmounting the workspace disconnects Nexconn.
  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
    setKnown(listIdentities());
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
  if (!session) return <WelcomePage known={known} onLoggedIn={handleLoggedIn} />;
  return (
    <ReaderPrefsProvider key={session.userId} userId={session.userId}>
      <Workspace session={session} onLogout={handleLogout} onSessionChange={handleLoggedIn} />
    </ReaderPrefsProvider>
  );
}
