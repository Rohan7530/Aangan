import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { useVoiceReply, voiceSupport } from '../../features/voice-reply/useVoiceReply';
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
  /** Phones: smaller box and buttons, label kept for screen readers. */
  compact?: boolean;
  /** Shown above the message box, e.g. quick replies. */
  above?: ReactNode;
}

// Comfort composer: one large text field and large labelled buttons:
// Photo, Speak (reserved slot), Send. Icons always come with text here.
export function ComfortComposer({ disabled, onSend, onPickPhoto, prefill, speechLang, onSendVoice, compact = false, above }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canSend = !disabled && !sending && text.trim().length > 0;
  const voice = useVoiceReply(speechLang);
  const [canSpeak] = useState(() => voiceSupport().speech);

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

  const big = `inline-flex ${compact ? 'min-h-[56px] px-3 text-[1.1875rem]' : 'min-h-[64px] px-5 text-[1.375rem]'} items-center justify-center gap-2 rounded-2xl font-bold`;

  return (
    <form onSubmit={submit} className={`shrink-0 border-t border-line bg-cream ${compact ? 'px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]' : 'px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]'}`} aria-label="Write a message">
      <div className={`mx-auto flex max-w-3xl flex-col ${compact ? 'gap-2' : 'gap-3'}`}>
        {voice.state.phase !== 'idle' ? (
          <VoicePanel voice={voice} size="comfort" onSend={onSendVoice} />
        ) : (
        <>
        {error && (
          <p id={errorId} role="alert" className="font-semibold text-danger">
            {error}
          </p>
        )}
        {above}
        <label htmlFor={COMFORT_INPUT_ID} className={compact ? 'sr-only' : 'text-[1.25rem] font-bold'}>
          Your message
        </label>
        <textarea
          ref={inputRef}
          id={COMFORT_INPUT_ID}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          rows={compact ? 1 : 2}
          placeholder={disabled ? 'Waiting for connection…' : 'Type your message here'}
          disabled={disabled}
          aria-describedby={error ? errorId : undefined}
          className="w-full resize-none rounded-2xl border-2 border-line-strong bg-surface px-5 py-4 leading-snug text-ink placeholder:text-ink-muted focus:border-green focus-visible:outline-offset-1 disabled:bg-sand"
          style={{ fontSize: 'var(--input-size)', minHeight: compact ? 64 : 112, maxHeight: compact ? 160 : undefined }}
        />
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
        <div className={`flex ${compact ? 'flex-nowrap gap-2' : 'flex-wrap gap-3'}`}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileRef.current?.click()}
            className={`${big} border-2 border-green bg-surface text-green hover:bg-green-soft disabled:opacity-60`}
          >
            <PhotoIcon />
            <span>Photo</span>
          </button>
          <SpeakButton supported={canSpeak} disabled={disabled} compact={compact} onStart={() => void voice.start()} />
          <button
            type="submit"
            disabled={!canSend}
            className={`${big} min-w-[6rem] flex-1 bg-terracotta text-white hover:bg-terracotta-deep disabled:bg-line disabled:text-ink-muted`}
          >
            <span>{sending ? 'Sending…' : 'Send'}</span>
            <SendIcon />
          </button>
        </div>
        </>
        )}
      </div>
    </form>
  );
}
