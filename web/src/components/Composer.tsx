import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ReaderMode } from '../features/reader-view';
import { VoiceReplySlot } from '../features/voice-reply/VoiceReplySlot';
import { SendIcon } from './icons';

interface Props {
  mode: ReaderMode;
  disabled: boolean;
  onSend: (text: string) => Promise<void>;
  /** Text to place in the box (e.g. a suggestion chip). `nonce` re-applies the same text. */
  prefill?: { text: string; nonce: number } | null;
}

export const COMPOSER_INPUT_ID = 'composer-input';

export function Composer({ mode, disabled, onSend, prefill }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const comfort = mode === 'comfort';
  const canSend = !disabled && !sending && text.trim().length > 0;

  useEffect(() => {
    if (!prefill) return;
    setText(prefill.text);
    inputRef.current?.focus();
  }, [prefill]);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    // Clear right away so anything typed while this one is sending is kept.
    setText('');
    setSending(true);
    setError(null);
    try {
      await onSend(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send. Please try again.');
      setText((current) => current || trimmed); // give the unsent words back
    } finally {
      setSending(false);
    }
  }

  // Enter sends, Shift+Enter adds a new line.
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  const placeholder = disabled ? 'Waiting for connection…' : comfort ? 'Type your message here' : 'Write a message';

  const field = (
    <textarea
      ref={inputRef}
      id={COMPOSER_INPUT_ID}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={onKeyDown}
      rows={comfort ? 2 : 1}
      placeholder={placeholder}
      disabled={disabled}
      aria-describedby={error ? errorId : undefined}
      autoComplete="off"
      className={`w-full resize-none border-2 border-line-strong bg-surface text-ink placeholder:text-ink-muted focus:border-green focus-visible:outline-offset-1 disabled:bg-sand ${
        comfort ? 'rounded-2xl px-5 py-4 leading-snug' : 'max-h-40 rounded-3xl px-5 py-[10px] leading-normal'
      }`}
      style={{ fontSize: 'var(--input-size)', minHeight: comfort ? 112 : 48 }}
    />
  );

  return (
    <form
      onSubmit={submit}
      className="shrink-0 border-t border-line bg-cream px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3"
      aria-label="Write a message"
    >
      {error && (
        <p id={errorId} role="alert" className="mb-2 font-semibold text-danger">
          {error}
        </p>
      )}

      {comfort ? (
        <div className="flex flex-col gap-3">
          <label htmlFor={COMPOSER_INPUT_ID} className="text-[1.25rem] font-bold">
            Your message
          </label>
          {field}
          <div className="flex gap-3">
            {/* SLOT: voice-reply "Speak" button, beside Send (see VoiceReplySlot). */}
            <VoiceReplySlot onText={(t) => setText((cur) => (cur ? `${cur} ${t}` : t))} disabled={disabled} />
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex min-h-[64px] flex-1 items-center justify-center gap-3 rounded-2xl bg-terracotta px-6 text-[1.5rem] font-bold text-white hover:bg-terracotta-deep disabled:bg-line disabled:text-ink-muted"
            >
              <span>{sending ? 'Sending…' : 'Send'}</span>
              <SendIcon />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <label htmlFor={COMPOSER_INPUT_ID} className="sr-only">
            Your message
          </label>
          {field}
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-3xl bg-terracotta px-5 font-semibold text-white hover:bg-terracotta-deep disabled:bg-line disabled:text-ink-muted"
          >
            <span>{sending ? 'Sending' : 'Send'}</span>
            <SendIcon />
          </button>
        </div>
      )}
    </form>
  );
}
