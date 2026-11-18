import { MicIcon } from '../../components/icons';
import { UNSUPPORTED_REASON } from './useVoiceReply';

// Comfort mode "Speak" button: large, labelled, beside Send. Where the browser
// cannot turn speech into text, the button is replaced by a short reason.
export function SpeakButton({ supported, disabled, onStart }: { supported: boolean; disabled?: boolean; onStart: () => void }) {
  if (!supported) {
    return <p className="flex min-h-[64px] max-w-[22rem] items-center text-[1.125rem] text-ink-muted">{UNSUPPORTED_REASON}</p>;
  }
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      className="inline-flex min-h-[64px] min-w-[64px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-line-strong bg-surface px-2 text-[1.1875rem] font-bold leading-none text-ink hover:bg-danger-soft disabled:opacity-60 @3xl:flex-row @3xl:gap-2 @3xl:px-4 @3xl:text-[1.25rem]"
    >
      <span className="text-danger">
        <MicIcon />
      </span>
      <span>Speak</span>
    </button>
  );
}
