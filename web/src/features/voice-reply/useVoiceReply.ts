import { useCallback, useEffect, useRef, useState } from 'react';

// Voice reply: speech-to-text with the browser's SpeechRecognition (in the
// speaker's language) while MediaRecorder records the audio, so the family can
// both read and play the message. Nexconn voice messages are at most 60 s.

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const RecognitionCtor = (): (new () => Recognition) | null => {
  const w = window as unknown as Record<string, unknown>;
  return ((w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => Recognition) | undefined) ?? null;
};

export const voiceSupport = (): { speech: boolean; audio: boolean } => ({
  speech: RecognitionCtor() !== null,
  audio: typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
});

export const UNSUPPORTED_REASON = 'Speaking to type works in Chrome, Edge or Safari. This browser does not support it.';

const MAX_MS = 60_000;

const ERRORS: Record<string, string> = {
  'not-allowed': 'The microphone is blocked. Allow microphone access for this site, then try again.',
  'service-not-allowed': 'The microphone is blocked. Allow microphone access for this site, then try again.',
  'no-speech': 'I did not hear anything. Please try again.',
  'audio-capture': 'No microphone was found.',
  network: 'Speaking to type needs an internet connection.',
  'language-not-supported': 'This language is not available for speaking to type in this browser.',
};

export type VoiceState =
  | { phase: 'idle' }
  | { phase: 'listening'; transcript: string; interim: string; startedAt: number }
  | { phase: 'review'; transcript: string; audio: File | null; seconds: number }
  | { phase: 'error'; message: string };

export function useVoiceReply(speechLang: string) {
  const [state, setState] = useState<VoiceState>({ phase: 'idle' });
  const rec = useRef<Recognition | null>(null);
  const media = useRef<{ recorder: MediaRecorder; stream: MediaStream; chunks: Blob[] } | null>(null);
  const finalText = useRef('');
  const interimText = useRef('');
  const startedAt = useRef(0);
  const stopping = useRef(false);
  const timer = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    try {
      rec.current?.abort();
    } catch {
      // already stopped
    }
    rec.current = null;
    const m = media.current;
    if (m) {
      if (m.recorder.state !== 'inactive') m.recorder.stop();
      m.stream.getTracks().forEach((t) => t.stop());
    }
    media.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(async () => {
    if (stopping.current) return;
    stopping.current = true;
    const seconds = Math.min(60, Math.round((Date.now() - startedAt.current) / 100) / 10);
    try {
      rec.current?.stop();
    } catch {
      // ignore
    }
    let audio: File | null = null;
    const m = media.current;
    if (m && m.recorder.state !== 'inactive') {
      const done = new Promise<void>((r) => (m.recorder.onstop = () => r()));
      m.recorder.stop();
      await done;
      const type = m.recorder.mimeType || 'audio/webm';
      const blob = new Blob(m.chunks, { type });
      if (blob.size > 0) audio = new File([blob], `voice.${type.includes('mp4') ? 'm4a' : 'webm'}`, { type });
    }
    cleanup();
    // give the recognizer a moment to deliver its last final result
    await new Promise((r) => setTimeout(r, 300));
    const transcript = `${finalText.current} ${interimText.current}`.replace(/\s+/g, ' ').trim();
    stopping.current = false;
    setState(transcript ? { phase: 'review', transcript, audio, seconds } : { phase: 'error', message: ERRORS['no-speech'] });
  }, [cleanup]);

  const start = useCallback(async () => {
    const Ctor = RecognitionCtor();
    if (!Ctor) {
      setState({ phase: 'error', message: UNSUPPORTED_REASON });
      return;
    }
    cleanup();
    finalText.current = '';
    interimText.current = '';
    stopping.current = false;

    // Audio (optional: if it fails we still send the transcript as "spoken" text).
    if (voiceSupport().audio) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        recorder.start(250);
        media.current = { recorder, stream, chunks };
      } catch (err) {
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setState({ phase: 'error', message: ERRORS['not-allowed'] });
          return;
        }
        media.current = null; // record transcript only
      }
    }

    const r = new Ctor();
    r.lang = speechLang;
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current = `${finalText.current} ${res[0].transcript}`.trim();
        else interim += res[0].transcript;
      }
      interimText.current = interim;
      setState((s) => (s.phase === 'listening' ? { ...s, transcript: finalText.current, interim } : s));
    };
    r.onerror = (e) => {
      if (e.error === 'aborted' || (e.error === 'no-speech' && finalText.current)) return;
      cleanup();
      setState({ phase: 'error', message: ERRORS[e.error] ?? 'Speaking to type stopped unexpectedly. Please try again.' });
    };
    r.onend = () => {
      // Browsers end recognition after a pause; keep listening until the person taps Stop.
      if (!stopping.current && rec.current === r) {
        try {
          r.start();
        } catch {
          void stop();
        }
      }
    };
    rec.current = r;
    startedAt.current = Date.now();
    try {
      r.start();
    } catch {
      cleanup();
      setState({ phase: 'error', message: 'Speaking to type could not start. Please try again.' });
      return;
    }
    setState({ phase: 'listening', transcript: '', interim: '', startedAt: startedAt.current });
    timer.current = window.setTimeout(() => void stop(), MAX_MS);
  }, [cleanup, speechLang, stop]);

  const cancel = useCallback(() => {
    stopping.current = true;
    cleanup();
    stopping.current = false;
    setState({ phase: 'idle' });
  }, [cleanup]);

  const setTranscript = useCallback(
    (t: string) => setState((s) => (s.phase === 'review' ? { ...s, transcript: t } : s)),
    [],
  );

  return { state, start, stop, cancel, redo: start, setTranscript, reset: () => setState({ phase: 'idle' }) };
}
