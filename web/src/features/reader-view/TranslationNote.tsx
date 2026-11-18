import { useState } from 'react';
import { sourceName } from './translation';
import type { TranslationState } from './useTranslations';

interface Props {
  state: TranslationState;
  original: string;
  /** Standard bubble (compact) or Comfort card (large, 56px buttons). */
  size: 'standard' | 'comfort';
  /** Standard bubbles end with an invisible copy of the time (see .time-spacer). */
  trailing?: React.ReactNode;
}

// The line under a translated message.
//   llm engine:     "Translated from Hindi · Show original" (original one tap away)
//   nexconn engine: "Machine translated · may have mistakes" + the original, always visible
//   unavailable:    "Translation not available yet" (the original is the main text)
export function TranslationNote({ state, original, size, trailing }: Props) {
  const [open, setOpen] = useState(false);
  const comfort = size === 'comfort';
  const meta = comfort ? 'mt-3 text-[1.125rem] text-ink-muted' : 'mt-1 text-[1rem] leading-snug text-ink-muted';
  const originalBox = comfort
    ? 'mt-3 rounded-2xl border-2 border-line bg-canvas px-4 py-3 text-[1.25rem] leading-snug text-ink'
    : 'mt-1 border-l-2 border-line-strong pl-2 text-[1rem] leading-snug text-ink-muted';

  if (state.status === 'pending') return <p className={meta}>Translating…{trailing}</p>;
  if (state.status === 'unavailable') return <p className={meta}>Translation not available yet{trailing}</p>;

  if (state.engine === 'nexconn') {
    return (
      <>
        <p className={meta}>Machine translated · may have mistakes</p>
        <p className={originalBox}>
          <span className="font-semibold">Original: </span>
          {original}
          {trailing}
        </p>
      </>
    );
  }

  return (
    <>
      <p className={`${meta} flex flex-wrap items-center gap-x-1`}>
        <span>Translated from {sourceName(state.sourceLang)} ·</span>
        <button
          type="button"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          className={
            comfort
              ? 'inline-flex min-h-[56px] items-center rounded-2xl px-2 text-[1.125rem] font-bold text-accent-ink underline underline-offset-4'
              : 'hit-48 font-semibold text-accent-ink underline underline-offset-2'
          }
        >
          {open ? 'Hide original' : 'Show original'}
        </button>
        {!open && trailing}
      </p>
      {open && (
        <p className={originalBox} lang="und">
          {original}
          {trailing}
        </p>
      )}
    </>
  );
}
