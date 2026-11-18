import { Sheet } from '../../components/Sheet';
import { StandardMessage } from '../../components/StandardMessage';
import type { RichMessage } from '../../nexconn/rich';
import { ComfortMessage } from './ComfortMessage';
import { TEXT_STEP_LABELS, type ReaderMode, type TextStep } from './prefs';
import { useReaderPrefs } from './ReaderPrefsContext';
import { LANGUAGES } from './translation';
import type { Speech } from './useSpeech';

interface Props {
  open: boolean;
  onClose: () => void;
  speech: Speech;
  myName: string;
}

const SAMPLE: RichMessage = {
  kind: 'text',
  reactions: {},
  id: 'preview-sample',
  channelId: 'preview',
  senderId: 'preview-meera',
  senderName: 'Meera',
  text: 'Dinner at 8 tonight. Everyone come home early!',
  sentAt: new Date().setHours(18, 30, 0, 0),
};

const MODES: { value: ReaderMode; title: string; detail: string }[] = [
  { value: 'standard', title: 'Standard', detail: 'Chat bubbles, more messages on screen.' },
  {
    value: 'comfort',
    title: 'Comfort',
    detail: 'Very large, clear text. One message at a time, with a Listen button.',
  },
];

const STEPS: TextStep[] = [0, 1, 2];
const STEP_GLYPH_SIZE: Record<TextStep, string> = { 0: '1.125rem', 1: '1.5rem', 2: '1.875rem' };

// "How I read": reading style, text size and a live preview.
export function ReaderSettingsSheet({ open, onClose, speech, myName }: Props) {
  const { prefs, setPrefs } = useReaderPrefs();

  return (
    <Sheet open={open} onClose={onClose} title="How I read" subtitle={`Only changes what ${myName} sees.`}>
      <fieldset>
        <legend className="mb-3 text-[1.125rem] font-bold">Reading style</legend>
        <div className="flex flex-col gap-3">
          {MODES.map((m) => (
            <label key={m.value} className="option-card">
              <input
                type="radio"
                name="reader-mode"
                value={m.value}
                checked={prefs.mode === m.value}
                onChange={() => {
                  if (m.value === 'standard') speech.stop();
                  setPrefs({ mode: m.value });
                }}
                className="sr-only"
              />
              <span className="radio-dot" aria-hidden="true" />
              <span>
                <span className="block font-bold">{m.title}</span>
                <span className="block text-ink-muted">{m.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="mb-1 text-[1.125rem] font-bold">My language</legend>
        <p className="mb-3 text-ink-muted">Messages from others are shown in this language. The original is always one tap away.</p>
        <div className="grid grid-cols-2 gap-3">
          {LANGUAGES.map((l) => (
            <label key={l.code} className="option-card items-center">
              <input
                type="radio"
                name="reader-language"
                value={l.code}
                checked={prefs.language === l.code}
                onChange={() => setPrefs({ language: l.code })}
                className="sr-only"
              />
              <span className="radio-dot" aria-hidden="true" />
              <span>
                <span className="block font-bold" lang={l.code}>
                  {l.native}
                </span>
                {l.native !== l.english && <span className="block text-ink-muted">{l.english}</span>}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-7">
        <legend className="mb-3 text-[1.125rem] font-bold">Text size</legend>
        <div className="grid grid-cols-3 gap-3">
          {STEPS.map((s) => (
            <label key={s} className="option-card flex-col items-center gap-1 text-center">
              <input
                type="radio"
                name="text-step"
                value={s}
                checked={prefs.textStep === s}
                onChange={() => setPrefs({ textStep: s })}
                className="sr-only"
              />
              <span className="radio-dot" aria-hidden="true" />
              <span aria-hidden="true" className="mt-1 font-bold leading-none" style={{ fontSize: STEP_GLYPH_SIZE[s] }}>
                A
              </span>
              <span>{TEXT_STEP_LABELS[s]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="mt-7" aria-label="Preview">
        <h3 className="mb-3 text-[1.125rem] font-bold">Preview</h3>
        <div
          className="reader-root rounded-3xl border border-line bg-canvas p-4"
          data-reader-mode={prefs.mode}
          data-text-step={prefs.textStep}
        >
          {prefs.mode === 'comfort' ? (
            <ComfortMessage as="div" msg={SAMPLE} mine={false} speech={speech} />
          ) : (
            <ul className="list-none">
              <StandardMessage msg={SAMPLE} mine={false} first last />
            </ul>
          )}
        </div>
      </section>

    </Sheet>
  );
}
