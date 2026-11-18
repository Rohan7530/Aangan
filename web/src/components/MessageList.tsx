import { useLayoutEffect, useMemo, useRef } from 'react';
import { ComfortMessage, type ReaderMode, type Speech } from '../features/reader-view';
import type { RichMessage } from '../nexconn/rich';
import { CourtyardIllustration } from './CourtyardIllustration';
import { buildItems } from './messageModel';
import { StandardMessage, type MessageHandlers } from './StandardMessage';

interface Props extends MessageHandlers {
  messages: RichMessage[];
  myUserId: string;
  mode: ReaderMode;
  loading: boolean;
  animateIds: ReadonlySet<string>;
  speech: Speech;
  /** Read state shown under my latest message, e.g. "Seen by Dadi, Papa". */
  seenBy: { messageId: string; text: string } | null;
  myReactionKey: string;
  onSuggest: (text: string) => void;
}

const NEAR_BOTTOM_PX = 160;
const SUGGESTIONS = ['Namaste, everyone! 🙏', 'Good morning, family ☀️', 'Who is free this Sunday?'];

export function MessageList({
  messages,
  myUserId,
  mode,
  loading,
  animateIds,
  speech,
  seenBy,
  myReactionKey,
  onSuggest,
  onReply,
  onReact,
  onOpenImage,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const hasScrolledOnce = useRef(false);
  const items = useMemo(() => buildItems(messages, myUserId), [messages, myUserId]);
  const lastMsg = messages[messages.length - 1];

  // Keep the newest message in view: on first load, on mode change, when the
  // read state appears, and for new messages if the reader was near the bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || messages.length === 0) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mineJustSent = lastMsg?.senderId === myUserId && animateIds.has(lastMsg.id);
    if (!hasScrolledOnce.current) {
      el.scrollTop = el.scrollHeight;
      hasScrolledOnce.current = true;
    } else if (nearBottom.current || mineJustSent) {
      el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [messages.length, lastMsg, myUserId, animateIds, seenBy?.text]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mode]);

  const jumpTo = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.classList.add('msg-flash');
    window.setTimeout(() => el.classList.remove('msg-flash'), 1200);
  };

  const comfort = mode === 'comfort';

  return (
    // Focusable region so keyboard users can scroll history with the arrow keys.
    <div
      ref={scrollRef}
      role="region"
      aria-label="Message history"
      tabIndex={0}
      className="min-h-0 flex-1 overflow-y-auto focus-visible:outline-offset-[-3px]"
      onScroll={(e) => {
        const el = e.currentTarget;
        nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      }}
    >
      {loading ? (
        <p role="status" className="px-6 py-10 text-center text-ink-muted">
          Gathering your family's messages…
        </p>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <CourtyardIllustration width={210} />
          <p className="mt-6 text-[1.375rem] font-bold text-green">Your courtyard is ready</p>
          <p className="mt-1 max-w-[20rem] text-ink-muted">Start the conversation. Everyone will read it their own way.</p>
          <p className="mt-6 font-semibold text-ink">Try saying</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => onSuggest(s)}
                  className="rounded-full border-2 border-line-strong bg-surface px-4 font-semibold text-ink hover:border-green hover:bg-green-soft"
                  style={{ minHeight: 'var(--tap)' }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ol
          aria-label="Messages"
          className={`list-none pb-4 ${comfort ? 'mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-2' : 'px-4 pt-1 sm:px-6'}`}
        >
          {items.map((item) => {
            if (item.kind === 'day') {
              return (
                <li key={item.key} className={`flex justify-center ${comfort ? 'pt-2' : 'pb-1 pt-5'}`}>
                  <span className="rounded-full bg-sand px-4 py-1 font-semibold text-ink">{item.label}</span>
                </li>
              );
            }
            const animate = animateIds.has(item.msg.id);
            const seen = seenBy && seenBy.messageId === item.msg.id ? seenBy.text : null;
            return comfort ? (
              <ComfortMessage
                key={item.key}
                msg={item.msg}
                mine={item.mine}
                animate={animate}
                speech={speech}
                seenBy={seen}
                onOpenImage={onOpenImage}
              />
            ) : (
              <StandardMessage
                key={item.key}
                msg={item.msg}
                mine={item.mine}
                first={item.first}
                last={item.last}
                animate={animate}
                seenBy={seen}
                myReactionKey={myReactionKey}
                onReply={onReply}
                onReact={onReact}
                onOpenImage={onOpenImage}
                onJumpTo={jumpTo}
              />
            );
          })}
        </ol>
      )}
    </div>
  );
}
