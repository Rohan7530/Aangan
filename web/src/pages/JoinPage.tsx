import { useEffect, useState, type FormEvent } from 'react';
import { getInviteInfo, joinInvite, login } from '../api';
import '@fontsource-variable/unbounded';
import '@fontsource-variable/figtree';
import '@fontsource/martian-mono/400.css';
import { NightBackdrop, NightMark } from '../components/NightBackdrop';
import { identityForName, loadSession, saveSession, setLastRoom, type Session } from '../session';

// /join/<code>: shows which room the invite opens, asks for a name if this
// browser has no session (e.g. a private window), then the server adds the
// user to that Nexconn group and the app opens it.
export function JoinPage({ code }: { code: string }) {
  const [room, setRoom] = useState<{ name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session] = useState<Session | null>(() => loadSession());
  const [useNewName, setUseNewName] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getInviteInfo(code)
      .then(setRoom)
      .catch((e) => setError(e instanceof Error ? e.message : 'This invite link is not valid.'));
  }, [code]);

  async function join(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      let s = session && !useNewName ? session : null;
      if (!s) {
        const trimmed = name.trim();
        if (!trimmed) {
          setError('Please type your name.');
          setBusy(false);
          return;
        }
        s = await login(trimmed, identityForName(trimmed)?.authKey);
      }
      const joined = await joinInvite(s.authKey, code);
      saveSession(s);
      setLastRoom(s.userId, joined.channelId);
      window.location.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join. Please try again.');
      setBusy(false);
    }
  }

  const askName = !session || useNewName;

  return (
    <main className="night-page flex min-h-full items-center justify-center px-5 py-10">
      <NightBackdrop />
      <div className="night-panel night-rise w-full max-w-md p-7 text-center">
        <div className="flex justify-center">
          <NightMark size={56} />
        </div>
        {room ? (
          <>
            <p className="night-eyebrow mt-5">You’re invited to</p>
            <h1 className="night-display night-glowtext mt-3 text-balance text-[2rem] leading-tight">{room.name}</h1>
            <form onSubmit={join} noValidate className="mt-6 text-left">
              {askName ? (
                <>
                  <label htmlFor="join-name" className="block text-[1.125rem] font-bold">
                    Your name
                  </label>
                  <p className="text-ink-muted">This is how the family will see you.</p>
                  <input
                    id="join-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={64}
                    autoComplete="given-name"
                    className="night-input mt-2"
                  />
                </>
              ) : (
                <p className="text-center text-[1.125rem]">
                  Joining as <strong>{session!.name}</strong>
                </p>
              )}
              {error && (
                <p role="alert" className="mt-2 font-semibold text-danger">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="night-btn night-btn-primary mt-4 w-full disabled:opacity-80"
              >
                {busy ? 'Joining…' : `Join ${room.name}`}
              </button>
              {session && !useNewName && (
                <button type="button" onClick={() => setUseNewName(true)} className="mt-2 min-h-[48px] w-full font-semibold text-accent-ink underline underline-offset-4">
                  Not {session.name}? Use a different name
                </button>
              )}
            </form>
          </>
        ) : (
          <p className="mt-6 text-[1.125rem]" role={error ? 'alert' : 'status'}>
            {error ?? 'Opening your invite…'}
          </p>
        )}
      </div>
    </main>
  );
}
