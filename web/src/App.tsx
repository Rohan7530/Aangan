import { useCallback, useState } from 'react';
import { ChatPage } from './pages/ChatPage';
import { LoginPage } from './pages/LoginPage';
import { clearSession, loadSession, saveSession, type Session } from './session';

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const handleLoggedIn = useCallback((s: Session) => {
    saveSession(s);
    setSession(s);
  }, []);

  const handleLogout = useCallback(() => {
    setSession((current) => {
      clearSession(current?.userId);
      return null;
    });
  }, []);

  if (!session) return <LoginPage onLoggedIn={handleLoggedIn} />;
  return <ChatPage key={session.userId} session={session} onLogout={handleLogout} />;
}
