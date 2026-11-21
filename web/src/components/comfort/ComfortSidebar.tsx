import type { ReaderLang } from '../../api';
import { shieldEnglish, shieldText } from '../../features/scam-shield';
import type { RoomSummary } from '../../nexconn/rooms';
import type { ConnectionState } from '../../nexconn/types';
import { Avatar } from '../Avatar';
import { BrandMark } from '../BrandMark';
import { ConnectionChip } from '../ConnectionChip';
import { PlusIcon, ShieldIcon } from '../icons';
import { formatListTime, senderLabel } from '../messageModel';
import { RoomAvatar } from '../workspace/RoomAvatar';

interface Props {
  rooms: RoomSummary[];
  loaded: boolean;
  activeId: string | null;
  onSelect: (channelId: string) => void;
  onNewRoom: () => void;
  me: { userId: string; name: string };
  connection: ConnectionState;
  /** Phones: the room list is the whole screen. */
  fullWidth?: boolean;
  /** Opens "Is this safe?". */
  onCheckSafe?: () => void;
  lang?: ReaderLang;
}

// Comfort room list: always visible on wide screens, the home screen on phones.
// Big rows, large text, everything spelled out ("3 new messages"), no icon-only
// buttons and nothing hidden behind a collapse toggle.
export function ComfortSidebar({ rooms, loaded, activeId, onSelect, onNewRoom, me, connection, fullWidth, onCheckSafe, lang = 'en' }: Props) {
  return (
    <nav aria-label="Rooms" className={`flex h-full shrink-0 flex-col border-r-2 border-line bg-sand/70 ${fullWidth ? 'w-full' : 'w-[360px] xl:w-[400px]'}`}>
      <div className="flex items-center gap-3 px-5 pb-3 pt-5">
        <BrandMark size={48} />
        <span className="text-[1.75rem] font-bold text-green">Aangan</span>
      </div>

      <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border-2 border-line bg-surface px-4 py-3">
        <Avatar id={me.userId} name={me.name} size={52} mine />
        <div className="min-w-0">
          <p className="truncate text-[1.375rem] font-bold leading-tight">{me.name}</p>
          <p className="text-[1.125rem]">
            <ConnectionChip state={connection} />
          </p>
        </div>
      </div>

      {onCheckSafe && (
        <button type="button" onClick={onCheckSafe} className="safe-cta mx-4 mb-4">
          <span className="safe-cta-icon" aria-hidden="true">
            <ShieldIcon />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[1.375rem] font-bold leading-tight">{shieldText(lang, 'isThisSafe')}</span>
            <span className="block text-[1.0625rem] leading-snug opacity-90">
              {shieldEnglish(lang, 'isThisSafe') ? `${shieldEnglish(lang, 'isThisSafe')} · ` : ''}Check an SMS or WhatsApp message
            </span>
          </span>
        </button>
      )}

      <h2 className="px-5 pb-2 text-[1.5rem] font-bold text-ink">My rooms</h2>

      <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {!loaded && <li className="px-3 py-4 text-[1.25rem] text-ink-muted">Loading your rooms…</li>}
        {rooms.map((r) => {
          const active = r.channelId === activeId;
          const who = r.last ? (r.last.senderId === me.userId ? 'You' : senderLabel(r.last)) : null;
          const what = r.last ? (r.last.kind === 'image' ? 'sent a photo' : r.last.kind === 'voice' ? `voice message: ${r.last.text}` : r.last.text) : 'No messages yet';
          return (
            <li key={r.channelId} className="mb-2">
              <button
                type="button"
                onClick={() => onSelect(r.channelId)}
                aria-current={active ? 'true' : undefined}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left ${
                  active
                    ? 'border-green bg-green-soft shadow-[inset_6px_0_0_var(--color-green)]'
                    : 'border-transparent bg-surface hover:border-line-strong'
                }`}
                style={{ minHeight: 96 }}
              >
                <RoomAvatar id={r.channelId} name={r.name} size={60} />
                <span className="min-w-0 flex-1">
                  {/* Full room name (wraps, never cut off), then the last message, then time + new count. */}
                  <span className="room-name line-clamp-2 block text-[1.375rem] font-bold leading-tight text-ink">{r.name}</span>
                  <span className="mt-1 line-clamp-2 block text-[1.125rem] leading-snug text-ink-muted">{who ? `${who}: ${what}` : what}</span>
                  {(r.last || r.unread > 0) && (
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {r.last && <span className="text-[1.125rem] text-ink-muted">{formatListTime(r.last.sentAt)}</span>}
                      {r.unread > 0 && (
                        <span className="rounded-xl bg-terracotta px-3 py-0.5 text-[1.125rem] font-bold text-white">
                          {r.unread} new {r.unread === 1 ? 'message' : 'messages'}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="border-t-2 border-line p-4">
        <button
          type="button"
          onClick={onNewRoom}
          className="inline-flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-green bg-surface text-[1.25rem] font-bold text-green hover:bg-green-soft"
        >
          <PlusIcon />
          <span>New room</span>
        </button>
      </div>
    </nav>
  );
}
