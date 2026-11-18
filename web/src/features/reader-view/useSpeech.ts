import { useCallback, useEffect, useRef, useState } from 'react';

// Read-aloud with the browser's Web Speech API (speechSynthesis).
// One message plays at a time; starting another stops the current one.

export interface Speech {
  supported: boolean;
  speakingId: string | null;
  speak: (id: string, text: string, lang?: string) => void;
  stop: () => void;
}

const DEVANAGARI = /[ऀ-ॿ]/;

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

// Pick a voice for the text's script: Hindi voice for Devanagari, otherwise
// the browser default (which follows the device language).
function pickVoice(text: string, lang?: string): { lang?: string; voice?: SpeechSynthesisVoice } {
  const want = lang ?? (DEVANAGARI.test(text) ? 'hi-IN' : undefined);
  if (!want) return {};
  const prefix = want.slice(0, 2).toLowerCase();
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang.toLowerCase() === want.toLowerCase()) ?? voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
  return { lang: want, voice };
}

export function useSpeech(): Speech {
  const [supported] = useState(isSupported);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const currentId = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (!isSupported()) return;
    currentId.current = null;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  const speak = useCallback((id: string, text: string, lang?: string) => {
    if (!isSupported()) return;
    const synth = window.speechSynthesis;
    synth.cancel(); // only one message at a time

    const utterance = new SpeechSynthesisUtterance(text);
    const { lang: useLang, voice } = pickVoice(text, lang);
    if (useLang) utterance.lang = useLang;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.92; // a little slower, easier to follow

    const finish = () => {
      // A cancelled earlier utterance also fires end/error: only clear if it is still ours.
      if (currentId.current === id) {
        currentId.current = null;
        setSpeakingId(null);
      }
    };
    utterance.onend = finish;
    utterance.onerror = finish;

    currentId.current = id;
    setSpeakingId(id);
    synth.speak(utterance);
  }, []);

  // Stop talking when the chat page goes away.
  useEffect(() => () => stop(), [stop]);

  return { supported, speakingId, speak, stop };
}
