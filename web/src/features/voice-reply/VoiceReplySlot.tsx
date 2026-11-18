import { useId } from 'react';
import { MicIcon } from '../../components/icons';

// ============================================================================
// SLOT: Voice reply — the "Speak" button (next feature).
//
// Sits beside Send in the Comfort composer. Until voice reply is built it is a
// visible, clearly disabled placeholder so the layout is final. When built:
// record speech and put the recognised text into the message field via onText
// (see IDEA.md, feature 2).
// ============================================================================

export interface VoiceReplySlotProps {
  /** Puts recognised speech into the composer's text field. */
  onText?: (text: string) => void;
  disabled?: boolean;
}

export function VoiceReplySlot(_props: VoiceReplySlotProps) {
  const noteId = useId();
  return (
    <>
      <button
        type="button"
        disabled
        aria-describedby={noteId}
        className="inline-flex min-h-[64px] shrink-0 cursor-not-allowed flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line-strong bg-sand px-5 font-semibold leading-tight text-ink-muted"
      >
        <span className="flex items-center gap-2 text-[1.25rem]">
          <MicIcon />
          Speak
        </span>
        <span className="text-[1rem] font-medium">soon</span>
      </button>
      <span id={noteId} className="sr-only">
        Voice reply is coming soon.
      </span>
    </>
  );
}
