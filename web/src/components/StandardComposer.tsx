import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useVoiceReply, voiceSupport, UNSUPPORTED_REASON } from '../features/voice-reply/useVoiceReply';
import { VoicePanel } from '../features/voice-reply/VoicePanel';
import type { RichMessage } from '../nexconn/rich';
import { EmojiPicker } from './EmojiPicker';
import { CloseIcon, MicIcon, PhotoIcon, SendIcon, SmileIcon } from './icons';
import { senderLabel } from './messageModel';

export const COMPOSER_INPUT_ID = 'composer-input';
const MAX_LINES = 5;

interface Props {
  disabled: boolean;
  onSend: (text: string) => Promise<void>;
  onPickPhoto: (file: File) => void;
  replyTo: RichMessage | null;
  onCancelReply: () => void;
  prefill?: { text: string; nonce: number } | null;
  /** Voice reply: speech-to-text language (e.g. "hi-IN") and how to send. */
  speechLang: string;
  onSendVoice: (transcript: string, audio: File | null) => Promise<void>;
}

// Standard composer: one compact row
// [ attach ] [ emoji ] [ text field, grows to 5 lines ] [ mic ] [ send ]
export function StandardComposer({ disabled, onSend, onPickPhoto, replyTo, onCancelReply, prefill, speechLang, onSendVoice }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const voice = useVoiceReply(speechLang);
  const [canSpeak] = useState(() => voiceSupport().speech);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const emojiBtn = useRef<HTMLButtonElement>(null);
  const errorId = useId();
  const canSend = !disabled && !sending && text.trim().length > 0;

  useEffect(() => {
    if (!prefill) return;
    setText(prefill.text);
    inputRef.current?.focus();
  }, [prefill]);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  // Grow with the text, up to five lines, then scroll.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const line = parseFloat(getComputedStyle(el).lineHeight) || 28;
    const pad = 20;
    el.style.height = `${Math.min(el.scrollHeight, line * MAX_LINES + pad)}px`;
  }, [text]);


  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setText(''); // clear at once so anything typed during the send is kept
    setSending(true);
    setError(null);
    try {
      await onSend(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send. Please try again.');
      setText((cur) => cur || trimmed);
    } finally {
      setSending(false);
    }
  }

  // Enter sends, Shift+Enter makes a new line.
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  // Caret to restore after an emoji insert, applied right after React renders
  // (not in requestAnimationFrame, which background tabs delay).
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (el && pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [text]);

  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    pendingCaret.current = start + emoji.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
  }

  const iconBtn =
    'grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-fill hover:text-ink disabled:opacity-50';

  return (
    <form onSubmit={submit} className="relative shrink-0 border-t border-line bg-surface px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2" aria-label="Write a message">
      {replyTo && (
        <div className="mb-2 flex items-center gap-3 rounded-[var(--radius-card)] border-l-4 border-accent bg-canvas px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-accent-ink">Replying to {senderLabel(replyTo)}</p>
            <p className="truncate text-ink-muted">{replyTo.kind === 'image' ? 'Photo' : replyTo.text}</p>
          </div>
          <button type="button" className={iconBtn} aria-label="Cancel reply" onClick={onCancelReply}>
            <CloseIcon />
          </button>
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" className="mb-2 font-semibold text-danger">
          {error}
        </p>
      )}
      {voice.state.phase !== 'idle' ? (
        <VoicePanel voice={voice} size="standard" onSend={onSendVoice} />
      ) : (
        <div className="flex items-end gap-1.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickPhoto(f);
              e.target.value = '';
            }}
          />
          {/* One row: Photo, Speak, the message box (emoji inside it), Send. */}
          <button type="button" className={iconBtn} aria-label="Attach a photo" title="Attach a photo" disabled={disabled} onClick={() => fileRef.current?.click()}>
            <PhotoIcon />
          </button>
          {canSpeak && (
            <button
              type="button"
              className={iconBtn}
              aria-label="Speak a message"
              title="Speak a message"
              disabled={disabled}
              onClick={() => void voice.start()}
            >
              <MicIcon />
            </button>
          )}
          <label htmlFor={COMPOSER_INPUT_ID} className="sr-only">
            Your message
          </label>
          <div className="relative min-w-0 flex-1">
            <textarea
              ref={inputRef}
              id={COMPOSER_INPUT_ID}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={disabled ? 'Waiting for connection…' : 'Write a message'}
              disabled={disabled}
              aria-describedby={error ? errorId : undefined}
              autoComplete="off"
              className="block min-h-[48px] w-full resize-none overflow-y-auto rounded-3xl border border-line-strong bg-surface py-[10px] pl-4 pr-12 leading-normal text-ink placeholder:text-ink-muted focus:border-accent focus-visible:outline-offset-1 disabled:bg-fill"
              style={{ fontSize: 'var(--input-size)' }}
            />
            <div className="absolute bottom-0 right-0">
              <button
                ref={emojiBtn}
                type="button"
                className={iconBtn}
                aria-label="Emoji"
                title="Emoji"
                aria-expanded={emojiOpen}
                aria-haspopup="dialog"
                disabled={disabled}
                onClick={() => setEmojiOpen((o) => !o)}
              >
                <SmileIcon />
              </button>
            </div>
            {emojiOpen && (
              <EmojiPicker
                onPick={(e) => insertEmoji(e)}
                onClose={() => {
                  setEmojiOpen(false);
                  emojiBtn.current?.focus();
                }}
              />
            )}
          </div>
          <button
            type="submit"
            disabled={!canSend}
            aria-label={sending ? 'Sending' : 'Send'}
            title="Send"
            className="send-btn grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent text-on-accent hover:bg-accent-deep disabled:bg-line disabled:text-ink-muted"
          >
            <SendIcon />
          </button>
        </div>
      )}
      {!canSpeak && <p className="mt-1 px-2 text-[1rem] text-ink-muted">{UNSUPPORTED_REASON}</p>}
    </form>
  );
}
