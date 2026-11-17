import { useState, type FormEvent } from 'react';
import { login } from '../api';
import { listSavedSessions, type Session } from '../session';

interface Props {
  onLoggedIn: (session: Session) => void;
}

export function LoginPage({ onLoggedIn }: Props) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved] = useState(() => listSavedSessions());

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      onLoggedIn(await login(trimmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center bg-stone-100 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold text-emerald-800">Aangan</h1>
        <p className="mt-1 text-stone-600">The family group chat where everyone reads in their own way.</p>

        <label htmlFor="name" className="mt-8 block text-lg font-medium text-stone-800">
          Your name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={64}
          autoFocus
          autoComplete="name"
          disabled={busy}
          className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-lg outline-none focus:border-emerald-600"
        />
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-lg font-semibold text-white disabled:bg-stone-300"
        >
          {busy ? 'Joining…' : 'Join the family'}
        </button>

        {saved.length > 0 && (
          <div className="mt-8 border-t border-stone-200 pt-6">
            <p className="text-sm font-medium text-stone-600">Or continue as</p>
            <ul className="mt-2 flex flex-col gap-2">
              {saved.map((s) => (
                <li key={s.userId}>
                  <button
                    type="button"
                    onClick={() => onLoggedIn(s)}
                    className="w-full rounded-xl border border-stone-300 px-4 py-2 text-left text-lg text-stone-800 hover:border-emerald-600"
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </main>
  );
}
