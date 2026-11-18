import { useEffect, useId, useState } from 'react';
import { MicIcon, SendIcon, StopIcon, TrashIcon } from '../../components/icons';
import type { useVoiceReply } from './useVoiceReply';

type Voice = ReturnType<typeof useVoiceReply>;

interface Props {
  voice: Voice;
  size: 'standard' | 'comfort';
  onSend: (transcript: string, audio: File | null) => Promise<void>;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Listening -> review (Send / Redo) for a voice reply. Rendered in place of the
// composer while voice.state.phase is not "idle".
export function VoicePanel({ voice, size, onSend }: Props) {
  const { state } = voice;
  const [now, setNow] = useState(Date.now());
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reviewId = useId();
  const comfort = size === 'comfort';

  useEffect(() => {
    if (state.phase !== 'listening') return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [state.phase]);

  async function send() {
    if (state.phase !== 'review' || !state.transcript.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSend(state.transcript.trim(), state.audio);
      voice.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  }

  // ---- listening ---------------------------------------------------------------------
  if (state.phase === 'listening') {
    const secs = (now - state.startedAt) / 1000;
    if (comfort) {
      return (
        <div className="rounded-3xl bg-[#7f1d12] p-5 text-white" role="group" aria-label="Listening">
          <p className="flex items-center gap-3 text-[2rem] font-bold leading-tight">
            <span className="rec-dot h-5 w-5 rounded-full bg-white" aria-hidden="true" />
            Listening…
            <span className="ml-auto text-[1.25rem] font-semibold tabular-nums">{clock(secs)}</span>
          </p>
          <p className="mt-3 min-h-[3.5rem] text-[1.5rem] leading-snug" aria-live="polite">
            {state.transcript}
            {state.interim && <span className="text-[#fde3dc]"> {state.interim}</span>}
            {!state.transcript && !state.interim && <span className="text-[#fde3dc]">Speak now. Your words will appear here.</span>}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void voice.stop()}
              className="on-dark inline-flex min-h-[72px] flex-1 items-center justify-center gap-3 rounded-2xl bg-white px-6 text-[1.5rem] font-bold text-[#7f1d12]"
            >
              <StopIcon />
              Stop
            </button>
            <button
              type="button"
              onClick={voice.cancel}
              className="on-dark inline-flex min-h-[72px] items-center justify-center rounded-2xl border-2 border-white px-5 text-[1.25rem] font-bold text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2" role="group" aria-label="Listening">
        <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-sand" aria-label="Cancel voice message" onClick={voice.cancel}>
          <TrashIcon />
        </button>
        <div className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 rounded-3xl border-2 border-danger bg-terracotta-soft px-4 py-2">
          <span className="rec-dot h-3 w-3 shrink-0 rounded-full bg-danger" aria-hidden="true" />
          <span className="shrink-0 font-semibold text-danger">Listening…</span>
          <span className="min-w-0 flex-1 truncate text-ink" aria-live="polite">
            {state.transcript} <span className="text-ink-muted">{state.interim}</span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-ink-muted">{clock(secs)}</span>
        </div>
        <button
          type="button"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-danger text-white hover:bg-[#7f1d12]"
          aria-label="Stop recording"
          title="Stop"
          onClick={() => void voice.stop()}
        >
          <StopIcon />
        </button>
      </div>
    );
  }

  // ---- review: Send or Redo ------------------------------------------------------------
  if (state.phase === 'review') {
    const note = state.audio ? `Voice recording attached (${clock(state.seconds)})` : 'Will be sent as text, marked “spoken”';
    return (
      <div className={comfort ? 'rounded-3xl border-2 border-line bg-surface p-5' : 'rounded-3xl border-2 border-line bg-surface p-3'}>
        <label htmlFor={reviewId} className={comfort ? 'block text-[1.375rem] font-bold' : 'block font-semibold'}>
          You said
        </label>
        <textarea
          id={reviewId}
          value={state.transcript}
          onChange={(e) => voice.setTranscript(e.target.value)}
          rows={comfort ? 3 : 2}
          className={`mt-2 w-full resize-none rounded-2xl border-2 border-line-strong bg-white px-4 py-3 text-ink focus:border-green focus-visible:outline-offset-1 ${
            comfort ? 'text-[1.5rem] leading-snug' : 'text-[1.125rem]'
          }`}
        />
        <p className={`mt-2 flex items-center gap-2 text-ink-muted ${comfort ? 'text-[1.125rem]' : ''}`}>
          <MicIcon /> {note}
        </p>
        {error && (
          <p role="alert" className="mt-2 font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void voice.redo()}
            disabled={sending}
            className={`inline-flex items-center justify-center rounded-2xl border-2 border-green bg-surface px-5 font-bold text-green hover:bg-green-soft ${
              comfort ? 'min-h-[64px] text-[1.375rem]' : 'min-h-[48px]'
            }`}
          >
            Redo
          </button>
          <button
            type="button"
            onClick={() => void send()}
            disabled={sending || !state.transcript.trim()}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-terracotta px-6 font-bold text-white hover:bg-terracotta-deep disabled:opacity-70 ${
              comfort ? 'min-h-[64px] text-[1.5rem]' : 'min-h-[48px]'
            }`}
          >
            {sending ? 'Sending…' : 'Send'}
            <SendIcon />
          </button>
          <button
            type="button"
            onClick={voice.cancel}
            disabled={sending}
            className={`rounded-2xl px-3 font-semibold text-ink-muted underline underline-offset-4 ${comfort ? 'min-h-[64px] text-[1.25rem]' : 'min-h-[48px]'}`}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---- error -------------------------------------------------------------------------------
  if (state.phase === 'error') {
    return (
      <div className={`rounded-3xl border-2 border-danger bg-terracotta-soft ${comfort ? 'p-5' : 'p-3'}`} role="alert">
        <p className={comfort ? 'text-[1.375rem] font-bold text-ink' : 'font-semibold text-ink'}>{state.message}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void voice.start()}
            className={`rounded-2xl bg-green px-5 font-bold text-white ${comfort ? 'min-h-[64px] text-[1.25rem]' : 'min-h-[48px]'}`}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={voice.cancel}
            className={`rounded-2xl border-2 border-line-strong bg-surface px-5 font-semibold text-ink ${comfort ? 'min-h-[64px] text-[1.25rem]' : 'min-h-[48px]'}`}
          >
            Close
          </button>
        </div>
      </div>
    );
  }
  return null;
}
