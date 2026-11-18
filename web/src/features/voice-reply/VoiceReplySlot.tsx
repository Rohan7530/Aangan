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
      className="inline-flex min-h-[64px] shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-danger bg-surface px-5 text-[1.375rem] font-bold text-danger hover:bg-terracotta-soft disabled:opacity-60"
    >
      <MicIcon />
      <span>Speak</span>
    </button>
  );
}
