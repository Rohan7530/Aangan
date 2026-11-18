import type { ChatMessage } from '../nexconn/types';
import { Avatar } from './Avatar';
import { CheckIcon } from './icons';
import { formatTime, senderLabel } from './messageModel';
import { useTone } from './tones';

interface Props {
  msg: ChatMessage;
  mine: boolean;
  first: boolean;
  last: boolean;
  animate?: boolean;
  /** "Seen by Dadi, Papa" under my latest message. */
  seenBy?: string | null;
}

// Standard mode: grouped bubbles. Mine on the right in terracotta; others on
// the left with avatar and name on the first message of a run. The time sits
// small and subtle inside every bubble.
export function StandardMessage({ msg, mine, first, last, animate = false, seenBy }: Props) {
  const name = senderLabel(msg);
  const tone = useTone(msg.senderId);
  const time = formatTime(msg.sentAt);
  return (
    <li className={`${first ? 'mt-4' : 'mt-1'} ${animate ? 'msg-enter' : ''}`}>
      <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
        {!mine && <div className="w-9 shrink-0 self-start">{first && <Avatar id={msg.senderId} name={name} />}</div>}
        <div className={`flex max-w-[80%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
          {!mine && first && (
            <span className="mb-1 px-1 font-semibold leading-tight" style={{ color: tone }} aria-hidden="true">
              {name}
            </span>
          )}
          <div className={`bubble ${mine ? 'bubble-mine' : 'bubble-theirs'} ${first ? 'is-first' : ''} ${last ? 'is-last' : ''}`}>
            <span className="sr-only">{mine ? 'You' : name}: </span>
            <p className="msg-text">
              {msg.text}
              <span className="time-spacer" aria-hidden="true">
                {time}
              </span>
            </p>
            <time dateTime={new Date(msg.sentAt).toISOString()} className="bubble-time">
              {time}
            </time>
          </div>
        </div>
      </div>
      {mine && seenBy && (
        <p className="mt-1 flex items-center justify-end gap-1 pr-1 text-ink-muted">
          <CheckIcon />
          <span>{seenBy}</span>
        </p>
      )}
    </li>
  );
}
