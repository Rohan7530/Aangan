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

// Comfort mode: one message per row on a light card with charcoal text (AAA).
// Others: white card, sender's colour as a thick left border.
// Mine: soft terracotta tint, terracotta left border, labelled "You".
// The solid green Listen button is the clearest thing on the card.
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
    <Tag
      id={`msg-${msg.id}`}
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

      {msg.reply && (
        <div className="mt-4 rounded-2xl border-l-8 border-line-strong bg-cream px-4 py-3 text-[1.25rem]">
          <p className="font-bold">Replying to {msg.reply.senderName ?? 'a message'}</p>
          <p className="line-clamp-3 text-ink">{msg.reply.text || 'Message'}</p>
        </div>
      )}

      <VoiceAttachment msg={msg} size="comfort" />

      {isPhoto ? (
        <button
          type="button"
          className="mt-4 block w-full overflow-hidden rounded-2xl border-2 border-line"
          onClick={() => msg.imageUrl && onOpenImage?.(msg.imageUrl, alt)}
          aria-label={`${alt}. Open larger`}
        >
          {msg.imageUrl && <img src={msg.imageUrl} alt="" className="max-h-[60dvh] w-full object-contain" style={msg.thumbnail ? { backgroundImage: `url(${msg.thumbnail})`, backgroundSize: 'cover' } : undefined} />}
        </button>
      ) : (
        <>
          <p className="comfort-text mt-4">{body}</p>
          {translation && <TranslationNote state={translation} original={msg.text} size="comfort" />}
        </>
      )}

      {reactions.length > 0 && (
        <p className="mt-3 text-[1.25rem] text-ink">
          <span className="sr-only">Reactions: </span>
          {reactions.join('   ')}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ListenButton messageId={msg.id} spokenText={spoken} sender={name} speech={speech} lang={translated ? speechLang(readerLang) : undefined} />
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
