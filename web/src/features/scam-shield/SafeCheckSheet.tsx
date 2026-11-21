import { useEffect, useState } from 'react';
import { shieldCheck, type ReaderLang, type ShieldVerdict } from '../../api';
import { ShieldIcon } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import type { Member } from '../../nexconn/group';
import type { Speech } from '../reader-view';
import { AskFamilyPanel } from './AskFamilyPanel';
import { ShieldWarning } from './ShieldWarning';
import { en, t } from './strings';

interface Props {
  open: boolean;
  onClose: () => void;
  me: { userId: string; authKey: string };
  lang: ReaderLang;
  members: Member[];
  speech: Speech;
}

// "Is this safe?": the reader pastes a message they got outside Aangan (SMS,
// WhatsApp, a caller's words) and gets a plain answer in their language, with
// "Ask my family" one tap away.
export function SafeCheckSheet({ open, onClose, me, lang, members, speech }: Props) {
  const [text, setText] = useState('');
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState<ShieldVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    if (open) return;
    // Fresh each time it opens.
    setText('');
    setVerdict(null);
    setError(null);
    setAsking(false);
  }, [open]);

  async function check() {
    if (!text.trim() || checking) return;
    setChecking(true);
    setError(null);
    setVerdict(null);
    try {
      setVerdict(await shieldCheck(me.authKey, text.trim(), lang));
    } catch {
      setError(t(lang, 'resting'));
    } finally {
      setChecking(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t(lang, 'isThisSafe')} subtitle={en(lang, 'isThisSafe') ?? 'Check a message before you reply'}>
      <div className="flex flex-col gap-4">
        <label htmlFor="safe-check-text" className="text-[1.25rem] font-semibold leading-snug">
          {t(lang, 'checkHint')}
          {lang !== 'en' && <span className="mt-1 block text-[1rem] font-normal text-ink-muted">{t('en', 'checkHint')}</span>}
        </label>
        <textarea
          id="safe-check-text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setVerdict(null);
            setAsking(false);
          }}
          rows={4}
          maxLength={4000}
          className="w-full resize-y rounded-2xl border-2 border-line-strong bg-surface px-4 py-3 text-[1.375rem] leading-snug focus:border-green"
          placeholder="Your account will be blocked today. Update KYC…"
        />
        <button
          type="button"
          onClick={() => void check()}
          disabled={!text.trim() || checking}
          className="inline-flex min-h-[64px] items-center justify-center gap-3 rounded-2xl bg-green px-6 text-[1.375rem] font-bold text-white hover:bg-[#173a2c] disabled:bg-line disabled:text-ink-muted"
        >
          <ShieldIcon />
          {checking ? t(lang, 'checking') : t(lang, 'check')}
        </button>

        {error && (
          <p role="alert" className="rounded-2xl bg-sand px-4 py-3 text-[1.25rem] font-semibold">
            {error}
          </p>
        )}

        <div aria-live="polite">
          {verdict && (
            <ShieldWarning
              verdict={verdict}
              size="comfort"
              lang={lang}
              speakId="safe-check"
              speech={speech}
              onAskFamily={() => setAsking(true)}
            />
          )}
        </div>

        {verdict && asking && (
          <AskFamilyPanel me={me} lang={lang} text={text.trim()} verdict={verdict} members={members} onDone={onClose} />
        )}
      </div>
    </Sheet>
  );
}

// The same "Ask my family" flow for a message inside a room.
export function AskFamilySheet({
  target,
  onClose,
  me,
  lang,
  members,
}: {
  target: { text: string; verdict: ShieldVerdict | null } | null;
  onClose: () => void;
  me: { userId: string; authKey: string };
  lang: ReaderLang;
  members: Member[];
}) {
  return (
    <Sheet open={target !== null} onClose={onClose} title={t(lang, 'askFamily')} subtitle={en(lang, 'askFamily') ?? 'Send this to someone you trust'}>
      {target && (
        <div className="flex flex-col gap-4">
          <blockquote className="rounded-2xl border-l-8 border-line-strong bg-surface px-4 py-3 text-[1.25rem] leading-snug">{target.text}</blockquote>
          <AskFamilyPanel me={me} lang={lang} text={target.text} verdict={target.verdict} members={members} onDone={onClose} />
        </div>
      )}
    </Sheet>
  );
}
