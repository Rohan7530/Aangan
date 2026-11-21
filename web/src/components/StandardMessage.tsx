import { useState } from 'react';
import { VoiceAttachment } from '../features/voice-reply/VoiceAttachment';
import { TranslationNote } from '../features/reader-view/TranslationNote';
import type { TranslationState } from '../features/reader-view/useTranslations';
import type { ShieldVerdict } from '../api';
import type { Lang } from '../features/reader-view/translation';
import { ShieldWarning } from '../features/scam-shield/ShieldWarning';
import type { RichMessage } from '../nexconn/rich';
import { Avatar } from './Avatar';
import { CheckIcon, CopyIcon, ReplyIcon, SmileIcon } from './icons';
import { formatTime, senderLabel } from './messageModel';
import { useTone } from './tones';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '🎉'];

export interface MessageHandlers {
  onReply?: (msg: RichMessage) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onOpenImage?: (url: string, alt: string) => void;
  onJumpTo?: (messageId: string) => void;
}

interface Props extends MessageHandlers {
  msg: RichMessage;
  mine: boolean;
  first: boolean;
  last: boolean;
  animate?: boolean;
  /** "Seen by Dadi, Papa" under my latest message. */
  seenBy?: string | null;
  /** My reactions metadata key, to highlight my own reactions. */
  myReactionKey?: string;
  /** Translation into the reader's language (other people's messages only). */
  translation?: TranslationState;
  shield?: ShieldVerdict;
  readerLang?: Lang;
  onAskFamily?: (msg: RichMessage, verdict: ShieldVerdict) => void;
}

function reactionCounts(reactions: Record<string, string[]>, myKey?: string) {
  const counts = new Map<string, { n: number; mine: boolean }>();
  for (const [key, emojis] of Object.entries(reactions)) {
    for (const e of emojis) {
      const c = counts.get(e) ?? { n: 0, mine: false };
      c.n += 1;
      if (key === myKey) c.mine = true;
      counts.set(e, c);
    }
  }
  return [...counts.entries()];
}

// Standard mode: grouped bubbles (max 65% of the chat width). Hover, keyboard
// focus or a tap shows the actions: react, reply, copy.
export function StandardMessage({
  msg,
  mine,
  first,
  last,
  animate = false,
  seenBy,
  myReactionKey,
  translation,
  shield,
  readerLang = 'en',
  onAskFamily,
  onReply,
  onReact,
  onOpenImage,
  onJumpTo,
}: Props) {
  const name = senderLabel(msg);
  const tone = useTone(msg.senderId);
  const time = formatTime(msg.sentAt);
  const [selected, setSelected] = useState(false);
  const [picking, setPicking] = useState(false);
  const [copied, setCopied] = useState(false);
  const interactive = Boolean(onReply || onReact);
  const counts = reactionCounts(msg.reactions ?? {}, myReactionKey);
  const alt = `Photo from ${mine ? 'you' : name}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(msg.kind === 'image' ? (msg.imageUrl ?? '') : msg.text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: nothing to do
    }
  }

  return (
    <li
      id={`msg-${msg.id}`}
      className={`msg-row ${first ? 'mt-4' : 'mt-1'} ${animate ? 'msg-enter' : ''}`}
      data-selected={selected || picking ? 'true' : undefined}
      onMouseLeave={() => setPicking(false)}
    >
      <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
        {!mine && <div className="w-9 shrink-0 self-start">{first && <Avatar id={msg.senderId} name={name} />}</div>}
        <div className={`relative flex max-w-[65%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
          {!mine && first && (
            <span className="mb-1 px-1 font-semibold leading-tight" style={{ color: tone }} aria-hidden="true">
              {name}
            </span>
          )}

          <div
            className={`bubble ${mine ? 'bubble-mine' : 'bubble-theirs'} ${first ? 'is-first' : ''} ${last ? 'is-last' : ''} ${
              msg.kind === 'image' ? 'bubble-photo' : ''
            }`}
            onClick={() => interactive && setSelected((s) => !s)}
          >
            <span className="sr-only">{mine ? 'You' : name}: </span>

            {msg.reply && (
              <button
                type="button"
                className={`reply-quote ${mine ? 'reply-quote-mine' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpTo?.(msg.reply!.messageId);
                }}
              >
                <span className="sr-only">Replying to </span>
                <span className="block font-semibold">{msg.reply.senderName ?? 'Family member'}</span>
                <span className="line-clamp-2 block">{msg.reply.text || 'Message'}</span>
              </button>
            )}

            <VoiceAttachment msg={msg} size="standard" />

            {msg.kind === 'image' ? (
              <button
                type="button"
                className="photo-button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (msg.imageUrl) onOpenImage?.(msg.imageUrl, alt);
                }}
                aria-label={`${alt}. Open larger`}
                style={msg.thumbnail ? { backgroundImage: `url(${msg.thumbnail})` } : undefined}
              >
                {msg.imageUrl && <img src={msg.imageUrl} alt="" loading="lazy" />}
              </button>
            ) : translation ? (
              <>
                <p className="msg-text">{translation.status === 'done' ? translation.translated : msg.text}</p>
                <TranslationNote
                  state={translation}
                  original={msg.text}
                  size="standard"
                  trailing={
                    <span className="time-spacer" aria-hidden="true">
                      {time}
                    </span>
                  }
                />
              </>
            ) : (
              <p className="msg-text">
                {msg.text}
                <span className="time-spacer" aria-hidden="true">
                  {time}
                </span>
              </p>
            )}
            <time dateTime={new Date(msg.sentAt).toISOString()} className="bubble-time">
              {time}
            </time>
          </div>

          {shield && (
            <ShieldWarning
              verdict={shield}
              size="standard"
              lang={readerLang}
              speakId={`shield-${msg.id}`}
              onAskFamily={onAskFamily ? () => onAskFamily(msg, shield) : undefined}
            />
          )}

          {counts.length > 0 && (
            <ul className={`mt-1 flex flex-wrap gap-1 ${mine ? 'justify-end' : ''}`} aria-label="Reactions">
              {counts.map(([emoji, c]) => (
                <li key={emoji}>
                  <button
                    type="button"
                    className={`reaction-chip ${c.mine ? 'reaction-chip-mine' : ''}`}
                    aria-pressed={c.mine}
                    aria-label={`${emoji} ${c.n}${c.mine ? ', including you' : ''}. ${c.mine ? 'Remove' : 'Add'} your reaction`}
                    onClick={() => onReact?.(msg.id, emoji)}
                    disabled={!onReact}
                  >
                    <span aria-hidden="true">{emoji}</span>
                    <span aria-hidden="true">{c.n}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {interactive && (
            <div className={`msg-actions ${mine ? 'msg-actions-mine' : 'msg-actions-theirs'}`} role="group" aria-label="Message actions">
              {picking ? (
                QUICK_REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="action-btn text-[1.25rem]"
                    aria-label={`React with ${e}`}
                    onClick={() => {
                      onReact?.(msg.id, e);
                      setPicking(false);
                      setSelected(false);
                    }}
                  >
                    {e}
                  </button>
                ))
              ) : (
                <>
                  <button type="button" className="action-btn" aria-label="React" title="React" onClick={() => setPicking(true)}>
                    <SmileIcon />
                  </button>
                  <button
                    type="button"
                    className="action-btn"
                    aria-label="Reply"
                    title="Reply"
                    onClick={() => {
                      onReply?.(msg);
                      setSelected(false);
                    }}
                  >
                    <ReplyIcon />
                  </button>
                  <button type="button" className="action-btn" aria-label={copied ? 'Copied' : 'Copy'} title="Copy" onClick={copy}>
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </>
              )}
            </div>
          )}
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
