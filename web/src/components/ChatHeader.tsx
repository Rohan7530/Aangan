import type { ConnectionState } from '../nexconn/types';
import { BrandMark } from './BrandMark';
import { ConnectionChip } from './ConnectionChip';
import { TextSizeIcon } from './icons';

interface Props {
  channelName: string;
  memberCount: number | null;
  onlineCount: number | null;
  connection: ConnectionState;
  onOpenMembers: () => void;
  onOpenReader: () => void;
}

export function ChatHeader({ channelName, memberCount, onlineCount, connection, onOpenMembers, onOpenReader }: Props) {
  const members = memberCount === null ? null : `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line bg-cream px-3 py-2">
      <BrandMark size={36} />
      {/* The whole title block is one large tap target that opens "Who's here". */}
      <button
        type="button"
        onClick={onOpenMembers}
        aria-haspopup="dialog"
        className="min-w-0 flex-1 rounded-2xl px-2 py-1 text-left hover:bg-sand"
        style={{ minHeight: 'var(--tap)' }}
      >
        <span
          className="line-clamp-2 block break-words font-bold leading-tight text-green"
          style={{ fontSize: 'var(--title-size)' }}
        >
          {channelName}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 text-[1rem] leading-snug text-ink-muted">
          {members && (
            <span className="whitespace-nowrap underline decoration-dotted underline-offset-4">
              {members}
              {onlineCount !== null && onlineCount > 0 && `, ${onlineCount} online`}
            </span>
          )}
          <span className="whitespace-nowrap">
            <ConnectionChip state={connection} />
          </span>
          <span className="sr-only">Show who is here</span>
        </span>
      </button>
      {/* Icon above a text label: compact enough for 375px. */}
      <button
        type="button"
        onClick={onOpenReader}
        aria-haspopup="dialog"
        className="inline-flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-green bg-surface px-3 py-1 font-semibold leading-tight text-green hover:bg-green-soft"
        style={{ minHeight: 'var(--tap)', minWidth: 'var(--tap)' }}
      >
        <TextSizeIcon />
        <span className="whitespace-nowrap">How I read</span>
      </button>
    </header>
  );
}
