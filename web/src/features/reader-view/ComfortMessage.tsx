import type { CSSProperties } from 'react';
import { Avatar } from '../../components/Avatar';
import { CheckIcon } from '../../components/icons';
import { VoiceAttachment } from '../voice-reply/VoiceAttachment';
import { formatTime, senderLabel } from '../../components/messageModel';
import { useTone } from '../../components/tones';
import type { RichMessage } from '../../nexconn/rich';
import { ListenButton } from './ListenButton';
import { saysPrefix, speechLang, type Lang } from './translation';
import { TranslationNote } from './TranslationNote';
import type { TranslationState } from './useTranslations';
import type { Speech } from './useSpeech';

interface Props {
  msg: RichMessage;
  mine: boolean;
  animate?: boolean;
  speech: Speech;
  seenBy?: string | null;
  as?: 'li' | 'div';
  onOpenImage?: (url: string, alt: string) => void;
  translation?: TranslationState;
  /** The reader's language: Listen reads translations in it. */
  readerLang?: Lang;
}

function reactionSummary(reactions: Record<string, string[]>): string[] {
  const counts = new Map<string, number>();
  for (const list of Object.values(reactions ?? {})) for (const e of list) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts.entries()].map(([e, n]) => `${e} ${n}`);
}

// Comfort mode: the same bubbles as Standard, larger and simpler.
// Others on the left with avatar and name, grey bubble, and a big Listen button
// inside it. Mine on the right, blue, no name. Time and "Seen by" under the bubble.
export function ComfortMessage({ msg, mine, animate = false, speech, seenBy, as: Tag = 'li', onOpenImage, translation, readerLang = 'en' }: Props) {
  const tone = useTone(msg.senderId);
  const name = mine ? 'You' : senderLabel(msg);
  const isPhoto = msg.kind === 'image';
  const translated = translation?.status === 'done' ? translation.translated : null;
  const body = isPhoto ? 'a photo' : (translated ?? msg.text);
  const spoken = translated
    ? `${saysPrefix(readerLang, name)} ${translated}`
    : isPhoto
    ? `${mine ? 'You' : name} sent a photo.`
    : msg.reply
      ? `${mine ? 'You replied' : `${name} replied`} to ${msg.reply.senderName ?? 'a message'}: ${msg.text}`
      : mine
        ? `You said: ${msg.text}`
        : `${name} says: ${msg.text}`;
  const reactions = reactionSummary(msg.reactions);
  const alt = `Photo from ${mine ? 'you' : name}`;

  return (
    <Tag id={`msg-${msg.id}`} className={`comfort-card c-row ${mine ? 'comfort-mine is-mine' : ''} ${animate ? 'msg-enter' : ''}`}>
      {!mine && (
        <span className="mb-9 self-end">
          <Avatar id={msg.senderId} name={name} size={48} photo={msg.senderPhoto} />
        </span>
      )}
      <div className="c-col">
        {!mine && (
          <p className="comfort-name tone-name px-1" style={{ '--tone': tone } as CSSProperties}>
            {name}
          </p>
        )}
        <div className="c-bubble">
          <span className="sr-only">{mine ? 'You' : name}: </span>
          {msg.reply && (
            <div className={`reply-quote ${mine ? 'reply-quote-mine' : ''} mb-3 text-[1.25rem]`}>
              <p className="font-bold">Replying to {msg.reply.senderName ?? 'a message'}</p>
              <p className="line-clamp-3">{msg.reply.text || 'Message'}</p>
            </div>
          )}

          <VoiceAttachment msg={msg} size="comfort" />

          {isPhoto ? (
            <button
              type="button"
              className="block w-full overflow-hidden rounded-2xl"
              onClick={() => msg.imageUrl && onOpenImage?.(msg.imageUrl, alt)}
              aria-label={`${alt}. Open larger`}
            >
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt=""
                  className="max-h-[60dvh] w-full object-contain"
                  style={msg.thumbnail ? { backgroundImage: `url(${msg.thumbnail})`, backgroundSize: 'cover' } : undefined}
                />
              )}
            </button>
          ) : (
            <>
              <p className="comfort-text">{body}</p>
              {translation && <TranslationNote state={translation} original={msg.text} size="comfort" />}
            </>
          )}

          {reactions.length > 0 && (
            <p className="mt-3 text-[1.25rem]">
              <span className="sr-only">Reactions: </span>
              {reactions.join('   ')}
            </p>
          )}

          {!mine && (
            <div className="mt-4">
              <ListenButton messageId={msg.id} spokenText={spoken} sender={name} speech={speech} lang={translated ? speechLang(readerLang) : undefined} />
            </div>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 px-1 text-[1.125rem] text-ink-muted">
          <time dateTime={new Date(msg.sentAt).toISOString()}>{formatTime(msg.sentAt)}</time>
          {mine && seenBy && (
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <CheckIcon />
              {seenBy}
            </span>
          )}
        </p>
      </div>
    </Tag>
  );
}
