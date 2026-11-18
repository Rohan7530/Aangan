import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { UNSUPPORTED_REASON, useVoiceReply, voiceSupport } from '../../features/voice-reply/useVoiceReply';
import { VoicePanel } from '../../features/voice-reply/VoicePanel';
import { SpeakButton } from '../../features/voice-reply/VoiceReplySlot';
import { PhotoIcon, SendIcon } from '../icons';

export const COMFORT_INPUT_ID = 'composer-input';

interface Props {
  disabled: boolean;
  onSend: (text: string) => Promise<void>;
  onPickPhoto: (file: File) => void;
  prefill?: { text: string; nonce: number } | null;
  speechLang: string;
  onSendVoice: (transcript: string, audio: File | null) => Promise<void>;
}

// Comfort composer: one large text field and large labelled buttons:
// Photo, Speak (reserved slot), Send. Icons always come with text here.
export function ComfortComposer({ disabled, onSend, onPickPhoto, prefill, speechLang, onSendVoice }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canSend = !disabled && !sending && text.trim().length > 0;
  const voice = useVoiceReply(speechLang);
  const [canSpeak] = useState(() => voiceSupport().speech);

  // The box grows with the text (up to ~5 lines), then scrolls.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 4, 200)}px`;
  }, [text]);

  useEffect(() => {
    if (!prefill) return;
    setText(prefill.text);
    inputRef.current?.focus();
  }, [prefill]);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setText('');
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

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  // Photo / Speak: white buttons, dark labels (AAA), coloured icons. Icon over label on phones.
  const big =
    'inline-flex min-h-[64px] min-w-[64px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-line-strong bg-surface px-2 text-[1.1875rem] font-bold leading-none hover:bg-accent-soft @3xl:flex-row @3xl:gap-2 @3xl:px-4 @3xl:text-[1.25rem]';

  return (
    <form onSubmit={submit} className="@container shrink-0 border-t border-line bg-surface px-3 sm:px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3" aria-label="Write a message">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        {voice.state.phase !== 'idle' ? (
          <VoicePanel voice={voice} size="comfort" onSend={onSendVoice} />
        ) : (
        <>
        {error && (
          <p id={errorId} role="alert" className="font-semibold text-danger">
            {error}
          </p>
        )}
        <label htmlFor={COMFORT_INPUT_ID} className="sr-only">
          Your message
        </label>
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
        {/* One row: Photo, Speak, the message box, Send. On phones the labels sit under the icons. */}
        <div className="flex items-end gap-2 @3xl:gap-3">
          <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()} className={`${big} text-ink disabled:opacity-60`}>
            <span className="text-accent-ink">
              <PhotoIcon />
            </span>
            <span>Photo</span>
          </button>
          {canSpeak && <SpeakButton supported disabled={disabled} onStart={() => void voice.start()} />}
          <textarea
            ref={inputRef}
            id={COMFORT_INPUT_ID}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={disabled ? 'Waiting for connection…' : 'Type a message'}
            disabled={disabled}
            aria-describedby={error ? errorId : undefined}
            className="min-w-0 flex-1 resize-none rounded-[24px] border border-line-strong bg-surface px-5 py-[14px] leading-snug text-ink placeholder:text-ink-muted focus:border-accent focus-visible:outline-offset-1 disabled:bg-fill"
            style={{ fontSize: 'var(--input-size)', minHeight: 64, maxHeight: 200 }}
          />
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex min-h-[64px] shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-5 text-[1.25rem] font-bold text-white hover:bg-accent-deep disabled:bg-fill disabled:text-ink-muted @3xl:px-7 @3xl:text-[1.375rem]"
          >
            <span>{sending ? 'Sending…' : 'Send'}</span>
            <span className="hidden @3xl:inline">
              <SendIcon />
            </span>
          </button>
        </div>
        {!canSpeak && <p className="text-[1.125rem] text-ink-muted">{UNSUPPORTED_REASON}</p>}
        </>
        )}
      </div>
    </form>
  );
}
