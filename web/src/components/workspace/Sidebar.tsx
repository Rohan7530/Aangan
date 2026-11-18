import type { ReactNode } from 'react';
import type { RoomSummary } from '../../nexconn/rooms';
import type { ConnectionState } from '../../nexconn/types';
import { BrandMark } from '../BrandMark';
import { PlusIcon, SidebarIcon } from '../icons';
import { ProfileRow } from '../ProfileRow';
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
      aria-label="My families"
      className={`flex h-full shrink-0 flex-col border-r border-line bg-canvas ${fullWidth ? 'w-full' : rail ? 'w-16' : 'w-[272px] xl:w-[300px]'}`}
    >
      {/* brand + collapse */}
      <div className={`flex items-center gap-2 px-4 pb-1 pt-4 ${rail ? 'flex-col px-2' : ''}`}>
        <BrandMark size={34} />
        {!rail && <span className="flex-1 text-[1.375rem] font-bold tracking-tight">Aangan</span>}
        {onToggleCollapsed && !fullWidth && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!rail}
            title={rail ? 'Expand sidebar' : 'Collapse sidebar'}
            className="grid h-12 w-12 place-items-center rounded-full text-ink-muted hover:bg-fill hover:text-ink"
          >
            <SidebarIcon />
          </button>
        )}
      </div>

      {!rail && (
        <h2 className="px-4 pb-1 pt-3 text-[1.25rem] font-bold">
          My families{totalUnread > 0 && <span className="sr-only">, {totalUnread} unread messages</span>}
        </h2>
      )}

      <ul className={`min-h-0 flex-1 overflow-y-auto pb-2 ${rail ? 'px-2 pt-2' : 'px-2'}`}>
        {!loaded && <li className="px-3 py-4 text-ink-muted">Loading your families…</li>}
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
                className={`relative flex w-full items-center gap-3 rounded-[var(--radius-card)] text-left ${rail ? 'justify-center p-1.5' : 'px-2.5 py-2'} ${
                  active ? 'bg-surface shadow-[var(--shadow-1)]' : 'hover:bg-fill'
                }`}
                style={{ minHeight: 60 }}
              >
                <span className="relative">
                  <RoomAvatar id={r.channelId} name={r.name} size={rail ? 44 : 48} />
                  {r.unread > 0 && <span className="unread-dot" aria-hidden="true" />}
                </span>
                {!rail && (
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className={`min-w-0 flex-1 truncate ${r.unread ? 'font-bold' : 'font-semibold'}`}>{r.name}</span>
                      {r.last && (
                        <span className={`shrink-0 text-[1rem] ${r.unread ? 'font-semibold text-accent-ink' : 'text-ink-muted'}`}>{formatListTime(r.last.sentAt)}</span>
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

      <div className={`shrink-0 border-t border-line ${rail ? 'flex flex-col items-center gap-2 px-2 py-3' : 'px-3 pb-3 pt-3'}`}>
        <button
          type="button"
          onClick={onNewRoom}
          aria-label={rail ? 'New family' : undefined}
          title={rail ? 'New family' : undefined}
          className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-surface font-semibold text-accent-ink shadow-[var(--shadow-1)] hover:bg-accent-soft ${
            rail ? 'w-12 px-0' : 'w-full px-4'
          }`}
        >
          <PlusIcon />
          {!rail && <span>New family</span>}
        </button>
        <div className={`relative ${rail ? '' : 'mt-2'}`}>
          <ProfileRow me={me} connection={connection} open={settingsOpen} onToggle={onToggleSettings} size={rail ? 'rail' : 'standard'} />
          {settingsPanel}
        </div>
      </div>
    </nav>
  );
}
