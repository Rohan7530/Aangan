import { useEffect, useMemo, useRef, useState } from 'react';
import { aiSummary, type ReaderLang, type Summary } from '../../api';
import { CloseIcon, SparkIcon, SpeakerIcon, StopIcon } from '../../components/icons';
import { senderLabel } from '../../components/messageModel';
import type { RichMessage } from '../../nexconn/rich';
import { speechLang, type Speech } from '../reader-view';
import { shieldEnglish as en, shieldText as t } from '../scam-shield';

interface Props {
  channelId: string;
  messages: RichMessage[];
  me: { userId: string; name: string; authKey: string };
  lang: ReaderLang;
  speech: Speech;
}

const SPEAK_ID = 'what-did-i-miss';
const seenKey = (userId: string, channelId: string) => `aangan.seen.${userId}.${channelId}`;

function readSeen(userId: string, channelId: string): number | null {
  try {
    const v = Number(localStorage.getItem(seenKey(userId, channelId)));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

// "What did I miss?": a short spoken summary of what others said since the
// reader last opened this room, in the reader's language.
export function WhatDidIMiss({ channelId, messages, me, lang, speech }: Props) {
  // When the reader last looked: read once per room visit, before we update it.
  const lastSeen = useRef<number | null>(null);
  const [roomReady, setRoomReady] = useState<string | null>(null);
  useEffect(() => {
    lastSeen.current = readSeen(me.userId, channelId);
    setRoomReady(channelId);
  }, [me.userId, channelId]);

  // While the room is open, everything shown counts as seen (for next time).
  const newest = messages[messages.length - 1]?.sentAt ?? 0;
  useEffect(() => {
    if (!newest || roomReady !== channelId) return;
    try {
      localStorage.setItem(seenKey(me.userId, channelId), String(Math.max(newest, Date.now())));
    } catch {
      // storage blocked: the button simply covers recent messages
    }
  }, [newest, me.userId, channelId, roomReady]);

  const missed = useMemo(() => {
    if (roomReady !== channelId) return [];
    const others = messages.filter((m) => m.senderId !== me.userId && m.text && m.kind !== 'image');
    const since = lastSeen.current;
    return since === null ? others.slice(-15) : others.filter((m) => m.sentAt > since).slice(-40);
  }, [messages, me.userId, channelId, roomReady]);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setSummary(null);
    setOpen(false);
  }, [channelId, lang]);

  const playing = speech.speakingId === SPEAK_ID;

  async function show() {
    setOpen(true);
    if (summary) {
      if (speech.supported) speech.speak(SPEAK_ID, summary.spoken, speechLang(lang));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const s = await aiSummary(
        me.authKey,
        lang,
        me.name,
        missed.map((m) => ({ sender: senderLabel(m), text: m.text, at: m.sentAt })),
      );
      setSummary(s);
      if (speech.supported) speech.speak(SPEAK_ID, s.spoken, speechLang(lang));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The summary is resting right now.');
    } finally {
      setLoading(false);
    }
  }

  if (missed.length < 2 && !open) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-3">
      {!open ? (
        <button type="button" onClick={() => void show()} className="assist-pill w-full">
          <span className="assist-pill-icon" aria-hidden="true">
            <SparkIcon />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[1.375rem] font-bold leading-tight">{t(lang, 'whatDidIMiss')}</span>
            <span className="block text-[1.0625rem] opacity-85">
              {en(lang, 'whatDidIMiss') ? `${en(lang, 'whatDidIMiss')} · ` : ''}
              {missed.length} new {missed.length === 1 ? 'message' : 'messages'}
            </span>
          </span>
          <SpeakerIcon />
        </button>
      ) : (
        <section className="assist-card" aria-label="What did I miss" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="assist-pill-icon" aria-hidden="true">
              <SparkIcon />
            </span>
            <p className="min-w-0 flex-1 text-[1.375rem] font-bold leading-tight">{t(lang, 'whatDidIMiss')}</p>
            <button
              type="button"
              onClick={() => {
                if (playing) speech.stop();
                setOpen(false);
              }}
              className="grid h-12 w-12 place-items-center rounded-full hover:bg-fill"
              aria-label="Close summary"
            >
              <CloseIcon />
            </button>
          </div>
          {loading && <p className="mt-3 text-[1.25rem]" role="status">{t(lang, 'summarising')}</p>}
          {error && <p className="mt-3 text-[1.25rem] font-semibold">{error}</p>}
          {summary && (
            <>
              <ul className="mt-3 space-y-2">
                {summary.lines.map((l) => (
                  <li key={l} className="flex gap-3 text-[1.375rem] leading-snug">
                    <span aria-hidden="true" className="mt-[0.55em] h-2.5 w-2.5 shrink-0 rounded-full bg-current opacity-70" />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
              {speech.supported && (
                <button
                  type="button"
                  onClick={() => (playing ? speech.stop() : speech.speak(SPEAK_ID, summary.spoken, speechLang(lang)))}
                  className="mt-4 inline-flex min-h-[56px] items-center gap-3 rounded-2xl bg-accent px-6 text-[1.25rem] font-bold text-white hover:bg-accent-deep"
                >
                  {playing ? <StopIcon /> : <SpeakerIcon />}
                  {t(lang, playing ? 'stop' : 'listen')}
                </button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
