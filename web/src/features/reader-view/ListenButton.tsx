import { SpeakerIcon, StopIcon } from '../../components/icons';
import type { Speech } from './useSpeech';

interface Props {
  messageId: string;
  /** What is read aloud, e.g. "Asha says: dinner at 8". */
  spokenText: string;
  /** Short name for the accessible label, e.g. "Asha". */
  sender: string;
  speech: Speech;
  /** BCP-47 voice language, e.g. "hi-IN" for a translated message. */
  lang?: string;
}

// Large, labelled read-aloud control (Comfort mode): solid blue pill with
// white text (10:1), so it is the clearest thing on the card. While reading it
// turns red and says "Stop". Hidden without speech support.
export function ListenButton({ messageId, spokenText, sender, speech, lang }: Props) {
  if (!speech.supported) return null;
  const playing = speech.speakingId === messageId;

  return (
    <button
      type="button"
      className={`inline-flex min-h-[56px] items-center gap-3 rounded-2xl px-6 text-[1.25rem] font-bold text-white shadow-sm transition-colors ${
        playing ? 'bg-rec hover:bg-rec-deep' : 'bg-accent hover:bg-accent-deep'
      }`}
      onClick={() => (playing ? speech.stop() : speech.speak(messageId, spokenText, lang))}
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
