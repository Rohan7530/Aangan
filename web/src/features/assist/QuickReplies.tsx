import { useEffect, useState } from 'react';
import { aiReplies, type ReaderLang } from '../../api';
import { senderLabel } from '../../components/messageModel';
import type { RichMessage } from '../../nexconn/rich';
import { shieldText as t } from '../scam-shield';

interface Props {
  /** The latest message from someone else. */
  message: RichMessage | null;
  lang: ReaderLang;
  authKey: string;
  /** Puts the reply in the message box; the reader still presses Send. */
  onPick: (text: string) => void;
}

const MAX_AGE_MS = 12 * 60 * 60 * 1000;

// One-tap replies to the latest message, in the reader's language.
export function QuickReplies({ message, lang, authKey, onPick }: Props) {
  const [replies, setReplies] = useState<string[]>([]);
  const id = message?.id;
  const text = message?.text ?? '';
  const sender = message ? senderLabel(message) : null;
  const usable = Boolean(message && text && message.kind !== 'image' && Date.now() - message.sentAt < MAX_AGE_MS);

  useEffect(() => {
    setReplies([]);
    if (!usable) return;
    let cancelled = false;
    aiReplies(authKey, lang, text, sender)
      .then((r) => !cancelled && setReplies(r.replies.slice(0, 3)))
      .catch(() => {
        // no suggestions: the composer works as usual
      });
    return () => {
      cancelled = true;
    };
  }, [id, usable, text, sender, lang, authKey]);

  if (!replies.length) return null;
  return (
    <div role="group" aria-label={`Quick replies to ${sender ?? 'the last message'}`}>
      <p className="mb-1.5 text-[1rem] font-semibold text-ink-muted">
        {t(lang, 'quickReplies')}
        {lang !== 'en' && ' · Quick replies'}
      </p>
      <ul className="flex flex-wrap gap-2">
        {replies.map((r) => (
          <li key={r}>
            <button type="button" onClick={() => onPick(r)} className="quick-reply">
              {r}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
