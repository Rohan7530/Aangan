import type { CSSProperties } from 'react';
import { Avatar } from '../../components/Avatar';
import { CheckIcon } from '../../components/icons';
import { formatTime, senderLabel } from '../../components/messageModel';
import { useTone } from '../../components/tones';
import type { ChatMessage } from '../../nexconn/types';
import { ListenButton } from './ListenButton';
import type { Speech } from './useSpeech';

interface Props {
  msg: ChatMessage;
  mine: boolean;
  animate?: boolean;
  speech: Speech;
  seenBy?: string | null;
  as?: 'li' | 'div';
}

// Comfort mode: one message per row on a light card with charcoal text (AAA).
// Others: white card, sender's colour as a thick left border.
// Mine: soft terracotta tint, terracotta left border, labelled "You".
// The solid green Listen button is the clearest thing on the card.
export function ComfortMessage({ msg, mine, animate = false, speech, seenBy, as: Tag = 'li' }: Props) {
  const tone = useTone(msg.senderId);
  const name = mine ? 'You' : senderLabel(msg);
  const spoken = mine ? `You said: ${msg.text}` : `${name} says: ${msg.text}`;

  return (
    <Tag
      className={`comfort-card ${mine ? 'comfort-mine' : ''} ${animate ? 'msg-enter' : ''}`}
      style={mine ? undefined : ({ '--card-accent': tone } as CSSProperties)}
    >
      <div className="flex items-center gap-3">
        <Avatar id={msg.senderId} name={mine ? (msg.senderName ?? 'You') : name} size={48} mine={mine} />
        <div className="min-w-0">
          <p className="comfort-name truncate">{name}</p>
          <p className="text-[1.125rem] text-ink-muted">
            <time dateTime={new Date(msg.sentAt).toISOString()}>{formatTime(msg.sentAt)}</time>
          </p>
        </div>
      </div>
      <p className="comfort-text mt-4">{msg.text}</p>
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ListenButton messageId={msg.id} spokenText={spoken} sender={name} speech={speech} />
        {mine && seenBy && (
          <p className="flex items-center gap-1.5 text-[1.125rem] font-semibold text-ink-muted">
            <CheckIcon />
            <span>{seenBy}</span>
          </p>
        )}
      </div>
    </Tag>
  );
}
