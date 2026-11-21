import { MicIcon } from '../../components/icons';
import { UNSUPPORTED_REASON } from './useVoiceReply';

// Comfort mode "Speak" button: large, labelled, beside Send. Where the browser
// cannot turn speech into text, the button is replaced by a short reason.
export function SpeakButton({ supported, disabled, compact, onStart }: { supported: boolean; disabled?: boolean; compact?: boolean; onStart: () => void }) {
  if (!supported) {
    return <p className={`flex max-w-[22rem] items-center text-ink-muted ${compact ? 'hidden' : 'min-h-[64px] text-[1.125rem]'}`}>{UNSUPPORTED_REASON}</p>;
  }
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-danger bg-surface font-bold ${compact ? 'min-h-[56px] px-3 text-[1.1875rem]' : 'min-h-[64px] px-5 text-[1.375rem]'} text-danger hover:bg-terracotta-soft disabled:opacity-60`}
    >
      <MicIcon />
      <span>Speak</span>
    </button>
  );
}
