import type { ReactNode } from 'react';
import type { RoomSummary } from '../../nexconn/rooms';
import type { ConnectionState } from '../../nexconn/types';
import { BrandMark } from '../BrandMark';
import { PlusIcon } from '../icons';
import { ProfileRow } from '../ProfileRow';
import { formatListTime, senderLabel } from '../messageModel';
import { RoomAvatar } from '../workspace/RoomAvatar';

interface Props {
  rooms: RoomSummary[];
  loaded: boolean;
  activeId: string | null;
  onSelect: (channelId: string) => void;
  onNewRoom: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  settingsPanel: ReactNode;
  me: { userId: string; name: string };
  connection: ConnectionState;
  /** Phones: the room list is the whole screen. */
  fullWidth?: boolean;
}

// Comfort family list: the same shell as Standard, larger and simpler.
// Always visible on wide screens, the home screen on phones. Big rows, large
// text, everything spelled out ("3 new messages"), no icon-only buttons.
export function ComfortSidebar({ rooms, loaded, activeId, onSelect, onNewRoom, settingsOpen, onToggleSettings, settingsPanel, me, connection, fullWidth }: Props) {
  return (
    <nav aria-label="My families" className={`flex h-full shrink-0 flex-col border-r border-line bg-canvas ${fullWidth ? 'w-full' : 'w-[340px] xl:w-[360px]'}`}>
      <div className="flex items-center gap-3 px-5 pb-2 pt-5">
        <BrandMark size={44} />
        <span className="text-[1.75rem] font-bold tracking-tight">Aangan</span>
      </div>

      <h2 className="px-5 pb-2 pt-2 text-[1.5rem] font-bold">My families</h2>

      <ul className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {!loaded && <li className="px-3 py-4 text-[1.25rem] text-ink-muted">Loading your families…</li>}
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
                className={`flex w-full items-center gap-4 rounded-[var(--radius-card)] p-4 text-left ${
                  active ? 'bg-surface shadow-[var(--shadow-2)] outline outline-2 outline-accent' : 'bg-surface hover:bg-accent-soft'
                }`}
                style={{ minHeight: 96 }}
              >
                <span className="relative">
                  <RoomAvatar id={r.channelId} name={r.name} size={60} />
                  {r.unread > 0 && <span className="unread-dot" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  {/* Full name (wraps, never cut off), then the last message, then time + new count. */}
                  <span className="room-name line-clamp-2 block text-[1.375rem] font-bold leading-tight text-ink">{r.name}</span>
                  <span className="mt-1 line-clamp-2 block text-[1.125rem] leading-snug text-ink-muted">{who ? `${who}: ${what}` : what}</span>
                  {(r.last || r.unread > 0) && (
                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {r.last && <span className="text-[1.125rem] text-ink-muted">{formatListTime(r.last.sentAt)}</span>}
                      {r.unread > 0 && (
                        <span className="rounded-full bg-accent px-3 py-0.5 text-[1.125rem] font-bold text-white">
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

      <div className="flex flex-col gap-3 border-t border-line p-4">
        <button
          type="button"
          onClick={onNewRoom}
          className="inline-flex min-h-[64px] w-full items-center justify-center gap-2 rounded-full bg-surface text-[1.25rem] font-bold text-accent-ink shadow-[var(--shadow-1)] hover:bg-accent-soft"
        >
          <PlusIcon />
          <span>New family</span>
        </button>
        {/* Me: avatar, name and status; opens Settings. */}
        <div className="relative">
          <ProfileRow me={me} connection={connection} open={settingsOpen} onToggle={onToggleSettings} size="comfort" />
          {settingsPanel}
        </div>
      </div>
    </nav>
  );
}
