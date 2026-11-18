import { useEffect, useState, type FormEvent } from 'react';
import { getInviteInfo, joinInvite, login } from '../api';
import { BrandMark } from '../components/BrandMark';
import { CourtyardIllustration } from '../components/CourtyardIllustration';
import { loadSession, saveSession, setLastRoom, type Session } from '../session';

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
        s = await login(trimmed);
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
    <main className="flex min-h-full items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-[28px] border border-line bg-surface p-7 text-center shadow-[0_18px_40px_-24px_rgb(42_37_34/0.45)]">
        <div className="flex justify-center">
          <BrandMark size={56} />
        </div>
        {room ? (
          <>
            <p className="mt-5 font-semibold text-terracotta-deep">You’re invited to</p>
            <h1 className="mt-1 text-balance text-[2rem] font-bold leading-tight text-green">{room.name}</h1>
            <div className="mt-5 flex justify-center">
              <CourtyardIllustration width={180} />
            </div>
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
                    className="mt-2 min-h-[56px] w-full rounded-2xl border-2 border-line-strong bg-white px-4 text-[1.25rem] focus:border-green focus-visible:outline-offset-1"
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
                className="mt-4 min-h-[56px] w-full rounded-2xl bg-terracotta px-6 text-[1.25rem] font-bold text-white hover:bg-terracotta-deep disabled:opacity-80"
              >
                {busy ? 'Joining…' : `Join ${room.name}`}
              </button>
              {session && !useNewName && (
                <button type="button" onClick={() => setUseNewName(true)} className="mt-2 min-h-[48px] w-full font-semibold text-green underline underline-offset-4">
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
