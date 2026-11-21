import { useState } from 'react';
import { askFamily, type ReaderLang, type ShieldVerdict } from '../../api';
import { Avatar } from '../../components/Avatar';
import { CheckIcon, UsersIcon } from '../../components/icons';
import type { Member } from '../../nexconn/group';
import { loadGuardian, saveGuardian, type Guardian } from './guardian';
import { en, t } from './strings';

interface Props {
  me: { userId: string; authKey: string };
  lang: ReaderLang;
  /** The suspicious message, exactly as received. */
  text: string;
  verdict: ShieldVerdict | null;
  /** People who can be chosen as the trusted person. */
  members: Member[];
  onDone: () => void;
}

// "Ask my family": one tap sends the message and the check result to the
// trusted person in a private room. The first time, the reader picks who.
export function AskFamilyPanel({ me, lang, text, verdict, members, onDone }: Props) {
  const [guardian, setGuardian] = useState<Guardian | null>(() => loadGuardian(me.userId));
  const [picking, setPicking] = useState(() => !loadGuardian(me.userId));
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const others = members.filter((m) => m.userId !== me.userId);

  async function send(g: Guardian) {
    setSending(true);
    setError(null);
    try {
      const r = await askFamily(me.authKey, { guardianId: g.userId, text, level: verdict?.level, category: verdict?.category ?? null });
      saveGuardian(me.userId, g);
      setGuardian(g);
      setSentTo(r.guardianName || g.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send. Please phone your family.');
    } finally {
      setSending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="rounded-3xl border-2 border-green bg-green-soft p-5 text-green" role="status">
        <p className="flex items-center gap-3 text-[1.375rem] font-bold">
          <CheckIcon /> {t(lang, 'sent', { name: sentTo })}
        </p>
        {en(lang, 'sent', { name: sentTo }) && <p className="mt-1 text-[1.0625rem]">{en(lang, 'sent', { name: sentTo })}</p>}
        <button type="button" onClick={onDone} className="mt-4 min-h-[56px] w-full rounded-2xl bg-green px-5 text-[1.25rem] font-bold text-white hover:bg-[#173a2c]">
          OK
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-2xl bg-terracotta-soft px-4 py-3 font-semibold text-danger">
          {error}
        </p>
      )}
      {guardian && !picking ? (
        <>
          <button
            type="button"
            disabled={sending}
            onClick={() => void send(guardian)}
            className="shield-btn shield-btn-solid min-h-[64px] w-full justify-center px-5 text-[1.375rem] disabled:opacity-70"
          >
            <UsersIcon />
            {sending ? t(lang, 'sending') : t(lang, 'sendTo', { name: guardian.name })}
          </button>
          <button type="button" onClick={() => setPicking(true)} className="mt-3 min-h-[48px] w-full font-semibold text-ink underline underline-offset-4">
            Choose someone else
          </button>
        </>
      ) : (
        <>
          <p className="text-[1.375rem] font-bold">{t(lang, 'whoToAsk')}</p>
          {en(lang, 'whoToAsk') && <p className="text-ink-muted">{en(lang, 'whoToAsk')}</p>}
          {others.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-sand px-4 py-3 text-[1.125rem]">
              Nobody else has joined this room yet. Please phone your family before you reply or pay anything.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {others.map((m) => (
                <li key={m.userId}>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => void send({ userId: m.userId, name: m.name })}
                    className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 text-left text-[1.25rem] font-bold hover:border-green hover:bg-green-soft disabled:opacity-60"
                  >
                    <Avatar id={m.userId} name={m.name} size={44} />
                    <span className="min-w-0 flex-1 truncate">{m.name}</span>
                    <span className="text-[1rem] font-semibold text-green">{t(lang, 'sendTo', { name: '' }).trim() || 'Send'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
