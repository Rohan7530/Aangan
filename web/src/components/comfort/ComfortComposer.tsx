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

  const big = 'inline-flex min-h-[64px] items-center justify-center gap-2 rounded-2xl px-4 text-[1.375rem] font-bold';

  return (
    <form onSubmit={submit} className="shrink-0 border-t border-line bg-cream px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3" aria-label="Write a message">
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
        {/* One line: message box, Photo, Speak, Send (buttons wrap below on phones). */}
        <div className="flex flex-wrap items-end gap-3">
          <textarea
            ref={inputRef}
            id={COMFORT_INPUT_ID}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={disabled ? 'Waiting for connection…' : 'Type your message here'}
            disabled={disabled}
            aria-describedby={error ? errorId : undefined}
            className="min-w-0 flex-[1_1_16rem] resize-none rounded-2xl border-2 border-line-strong bg-surface px-5 py-[14px] leading-snug text-ink placeholder:text-ink-muted focus:border-green focus-visible:outline-offset-1 disabled:bg-sand"
            style={{ fontSize: 'var(--input-size)', minHeight: 64, maxHeight: 200 }}
          />
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileRef.current?.click()}
              className={`${big} border-2 border-green bg-surface text-green hover:bg-green-soft disabled:opacity-60`}
            >
              <PhotoIcon />
              <span>Photo</span>
            </button>
            {canSpeak && <SpeakButton supported disabled={disabled} onStart={() => void voice.start()} />}
            <button
              type="submit"
              disabled={!canSend}
              className={`${big} bg-terracotta text-white hover:bg-terracotta-deep disabled:bg-line disabled:text-ink-muted`}
            >
              <span>{sending ? 'Sending…' : 'Send'}</span>
              <SendIcon />
            </button>
          </div>
        </div>
        {!canSpeak && <p className="text-[1.125rem] text-ink-muted">{UNSUPPORTED_REASON}</p>}
        </>
        )}
      </div>
    </form>
  );
}
