import { MicIcon } from '../../components/icons';
import type { RichMessage } from '../../nexconn/rich';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

// Shown above the words of a voice reply: the recording (if any) and a label.
// The words themselves (the transcript) render like any text message, so they
// are translated and read aloud the same way.
export function VoiceAttachment({ msg, size }: { msg: RichMessage; size: 'standard' | 'comfort' }) {
  const comfort = size === 'comfort';
  if (msg.kind !== 'voice' && !msg.spoken) return null;
  const label = msg.kind === 'voice' ? `Voice message${msg.duration ? ` · ${clock(msg.duration)}` : ''}` : 'Spoken';
  return (
    <div className={comfort ? 'mt-4 flex flex-col gap-2' : 'mb-1 flex flex-col gap-1'} onClick={(e) => e.stopPropagation()}>
      <p className={`voice-label flex items-center gap-1.5 font-semibold ${comfort ? 'text-[1.125rem]' : 'text-[0.9375rem]'}`}>
        <MicIcon />
        <span>{label}</span>
      </p>
      {msg.kind === 'voice' && msg.audioUrl && (
        <audio
          controls
          preload="none"
          src={msg.audioUrl}
          className={comfort ? 'h-14 w-full' : 'h-10 w-full min-w-[220px]'}
          aria-label={`Play voice recording${msg.senderName ? ` from ${msg.senderName}` : ''}`}
        />
      )}
    </div>
  );
}
