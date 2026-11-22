import { useState } from 'react';
import type { ReaderLang, ShieldVerdict } from '../../api';
import { AlertIcon, ShieldIcon, SpeakerIcon, StopIcon, UsersIcon } from '../../components/icons';
import { speechLang, type Speech } from '../reader-view';
import { en, t } from './strings';

interface Props {
  verdict: ShieldVerdict;
  /** comfort: large card for elders. standard: a small note for younger readers. */
  size: 'comfort' | 'standard';
  lang: ReaderLang;
  /** Unique id for read-aloud (one voice at a time). */
  speakId: string;
  speech?: Speech;
  onAskFamily?: () => void;
}

// The warning is sized to the reader: elders get a big, calm card with what
// to do; younger members get one line they can expand. The original message
// always stays visible above it.
export function ShieldWarning({ verdict, size, lang, speakId, speech, onAskFamily }: Props) {
  const [open, setOpen] = useState(false);
  const danger = verdict.level === 'danger';
  const safe = verdict.level === 'safe';
  const tone = safe ? 'shield-safe' : danger ? 'shield-danger' : 'shield-caution';
  const englishTitle = safe ? 'Looks safe' : danger ? 'This may be a scam' : 'Be careful with this message';
  const lines = [verdict.explanation, ...verdict.advice].filter((l): l is string => Boolean(l?.trim()));
  const spoken = [verdict.title, ...lines].join('. ');
  const playing = speech?.speakingId === speakId;

  if (size === 'standard') {
    return (
      <div className={`shield-note shield-enter ${tone}`} role="note">
        <button type="button" className="flex w-full items-center gap-2 text-left font-semibold" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {safe ? <ShieldIcon /> : <AlertIcon />}
          <span className="min-w-0 flex-1">
            {verdict.title}
            {lang !== 'en' && <span className="ml-2 font-normal opacity-80">({englishTitle})</span>}
          </span>
          <span className="shrink-0 text-[1rem] underline underline-offset-4">{open ? 'Hide' : 'Why?'}</span>
        </button>
        {open && (
          <div className="mt-2">
            <ul className="list-disc space-y-1 pl-6">
              {lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            {onAskFamily && !safe && (
              <button type="button" onClick={onAskFamily} className="shield-btn mt-3 min-h-[44px] px-4">
                <UsersIcon /> {t(lang, 'askFamily')}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className={`shield-card shield-enter ${tone}`} aria-label={englishTitle}>
      <div className="flex items-start gap-3">
        <span className="shield-badge" aria-hidden="true">
          {safe ? <ShieldIcon /> : <AlertIcon />}
        </span>
        <div className="min-w-0">
          <p className="text-[1.5rem] font-bold leading-tight">{verdict.title}</p>
          {lang !== 'en' && <p className="text-[1.0625rem] font-semibold opacity-80">{englishTitle}</p>}
        </div>
      </div>
      {lines.length > 0 && (
        <ul className="mt-3 space-y-2 text-[1.3125rem] leading-snug">
          {lines.map((l) => (
            <li key={l} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {onAskFamily && (
          <button type="button" onClick={onAskFamily} className={`shield-btn min-h-[56px] px-5 text-[1.25rem] ${safe ? '' : 'shield-btn-solid'}`}>
            <UsersIcon />
            <span className="flex flex-col items-start leading-tight">
              <span>{t(lang, 'askFamily')}</span>
              {en(lang, 'askFamily') && <span className="text-[0.95rem] font-semibold opacity-90">{en(lang, 'askFamily')}</span>}
            </span>
          </button>
        )}
        {speech?.supported && (
          <button
            type="button"
            onClick={() => (playing ? speech.stop() : speech.speak(speakId, spoken, speechLang(lang)))}
            className="shield-btn min-h-[56px] px-5 text-[1.25rem]"
          >
            {playing ? <StopIcon /> : <SpeakerIcon />}
            <span>{t(lang, playing ? 'stop' : 'listen')}</span>
          </button>
        )}
      </div>
    </section>
  );
}
