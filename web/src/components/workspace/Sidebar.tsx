import type { ReactNode } from 'react';
import type { RoomSummary } from '../../nexconn/rooms';
import type { ConnectionState } from '../../nexconn/types';
import { Avatar } from '../Avatar';
import { BrandMark } from '../BrandMark';
import { ConnectionChip } from '../ConnectionChip';
import { GearIcon, PlusIcon, SidebarIcon } from '../icons';
import { formatListTime, senderLabel } from '../messageModel';
import { RoomAvatar } from './RoomAvatar';

interface Props {
  rooms: RoomSummary[];
  loaded: boolean;
  activeId: string | null;
  onSelect: (channelId: string) => void;
  onNewRoom: () => void;
  me: { userId: string; name: string };
  connection: ConnectionState;
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  /** The Settings panel; pops up from the gear button. */
  settingsPanel: ReactNode;
  /** Mobile: the room list is the whole screen. */
  fullWidth?: boolean;
}

function preview(r: RoomSummary, myId: string): string {
  if (!r.last) return 'No messages yet';
  const who = r.last.senderId === myId ? 'You' : senderLabel(r.last);
  const what = r.last.kind === 'image' ? '📷 Photo' : r.last.kind === 'voice' ? `🎤 ${r.last.text || 'Voice message'}` : r.last.text;
  return `${who}: ${what}`;
}

export function Sidebar({ rooms, loaded, activeId, onSelect, onNewRoom, me, connection, collapsed, onToggleCollapsed, settingsOpen, onToggleSettings, settingsPanel, fullWidth }: Props) {
  const rail = collapsed && !fullWidth;
  const totalUnread = rooms.reduce((n, r) => n + r.unread, 0);

  return (
    <nav
      aria-label="Rooms"
      className={`flex h-full shrink-0 flex-col border-r border-line bg-sand/60 ${
        fullWidth ? 'w-full' : rail ? 'w-16' : 'w-[272px] xl:w-[300px]'
      }`}
    >
      {/* brand + collapse */}
      <div className={`flex items-center gap-2 px-3 pb-2 pt-3 ${rail ? 'flex-col' : ''}`}>
        <BrandMark size={rail ? 36 : 36} />
        {!rail && <span className="flex-1 text-[1.375rem] font-bold text-green">Aangan</span>}
        {onToggleCollapsed && !fullWidth && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!rail}
            title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            className="grid h-12 w-12 place-items-center rounded-2xl text-ink-muted hover:bg-sand hover:text-ink"
          >
            <SidebarIcon />
          </button>
        )}
      </div>

      <div className="mx-3 mb-2">
        <button
          type="button"
          onClick={onNewRoom}
          aria-label={rail ? 'New room' : undefined}
          title={rail ? 'New room' : undefined}
          className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-green bg-surface font-semibold text-green hover:bg-green-soft ${
            rail ? 'w-10 px-0' : 'w-full px-4'
          }`}
        >
          <PlusIcon />
          {!rail && <span>New room</span>}
        </button>
      </div>

      {!rail && (
        <h2 className="px-5 pb-1 pt-2 text-[1rem] font-semibold uppercase tracking-wide text-ink-muted">
          Rooms{totalUnread > 0 && <span className="sr-only">, {totalUnread} unread messages</span>}
        </h2>
      )}

      <ul className={`min-h-0 flex-1 overflow-y-auto pb-3 ${rail ? 'px-2' : 'px-2'}`}>
        {!loaded && <li className="px-3 py-4 text-ink-muted">Loading rooms…</li>}
        {rooms.map((r) => {
          const active = r.channelId === activeId;
          const label = `${r.name}${r.unread ? `, ${r.unread} unread` : ''}`;
          return (
            <li key={r.channelId}>
              <button
                type="button"
                onClick={() => onSelect(r.channelId)}
                aria-current={active ? 'true' : undefined}
                aria-label={rail ? label : undefined}
                title={rail ? label : undefined}
                className={`relative flex w-full items-center gap-3 rounded-2xl text-left ${
                  rail ? 'justify-center p-1.5' : 'px-3 py-2.5'
                } ${active ? 'bg-surface shadow-[inset_4px_0_0_var(--color-terracotta)]' : 'hover:bg-surface/70'}`}
                style={{ minHeight: 56 }}
              >
                <span className="relative">
                  <RoomAvatar id={r.channelId} name={r.name} size={rail ? 40 : 44} />
                  {rail && r.unread > 0 && (
                    <span className="unread-badge absolute -right-1.5 -top-1.5" aria-hidden="true">
                      {r.unread > 99 ? '99+' : r.unread}
                    </span>
                  )}
                </span>
                {!rail && (
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate ${r.unread ? 'font-bold' : 'font-semibold'}`}>{r.name}</span>
                      {r.last && (
                        <span className={`shrink-0 text-[1rem] ${r.unread ? 'font-semibold text-terracotta-deep' : 'text-ink-muted'}`}>
                          {formatListTime(r.last.sentAt)}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`min-w-0 flex-1 truncate text-[1rem] ${r.unread ? 'text-ink' : 'text-ink-muted'}`}>{preview(r, me.userId)}</span>
                      {r.unread > 0 && (
                        <span className="unread-badge" aria-label={`${r.unread} unread`}>
                          {r.unread > 99 ? '99+' : r.unread}
                        </span>
                      )}
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* me: avatar, name, connection, settings */}
      <div className={`relative flex shrink-0 items-center gap-3 border-t border-line px-3 py-3 ${rail ? 'flex-col gap-2 px-2' : ''}`}>
        <span title={rail ? `${me.name} (you)` : undefined} className="relative">
          <Avatar id={me.userId} name={me.name} size={40} mine />
          {rail && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-cream ${connection === 'connected' ? 'bg-green' : 'bg-ochre'}`}
              aria-hidden="true"
            />
          )}
        </span>
        {!rail && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold leading-tight">{me.name}</p>
            <p className="text-[1rem] leading-tight">
              <ConnectionChip state={connection} />
            </p>
          </div>
        )}
        <button
          type="button"
          data-settings-trigger
          onClick={onToggleSettings}
          aria-expanded={settingsOpen}
          aria-label="Settings"
          title="Settings"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-ink-muted hover:bg-surface hover:text-ink"
        >
          <GearIcon />
        </button>
        {settingsPanel}
      </div>
    </nav>
  );
}
