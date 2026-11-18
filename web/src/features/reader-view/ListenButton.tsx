import { SpeakerIcon, StopIcon } from '../../components/icons';
import type { Speech } from './useSpeech';

interface Props {
  messageId: string;
  /** What is read aloud, e.g. "Asha says: dinner at 8". */
  spokenText: string;
  /** Short name for the accessible label, e.g. "Asha". */
  sender: string;
  speech: Speech;
}

// Large, labelled read-aloud control (Comfort mode): solid deep green with
// white text (10:1), so it is the clearest thing on the card. While reading it
// turns deep terracotta and says "Stop". Hidden without speech support.
export function ListenButton({ messageId, spokenText, sender, speech }: Props) {
  if (!speech.supported) return null;
  const playing = speech.speakingId === messageId;

  return (
    <button
      type="button"
      className={`inline-flex min-h-[56px] items-center gap-3 rounded-2xl px-6 text-[1.25rem] font-bold text-white shadow-sm transition-colors ${
        playing ? 'bg-terracotta-deep hover:bg-[#6f2b14]' : 'bg-green hover:bg-[#173a2c]'
      }`}
      onClick={() => (playing ? speech.stop() : speech.speak(messageId, spokenText))}
      aria-label={playing ? `Stop reading ${sender}'s message` : `Listen to ${sender}'s message`}
    >
      {playing ? (
        <>
          <span className="speaking-bars flex items-center gap-[3px]" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <StopIcon />
          <span>Stop</span>
        </>
      ) : (
        <>
          <SpeakerIcon />
          <span>Listen</span>
        </>
      )}
    </button>
  );
}
