import type { Member } from '../nexconn/group';
import type { PresenceMap } from '../nexconn/presence';
import { Avatar } from './Avatar';
import { Sheet } from './Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  members: Member[];
  myUserId: string;
  /** null = presence not available. */
  presence: PresenceMap | null;
}

// "Who's here": every member, and who is online right now.
export function MembersSheet({ open, onClose, members, myUserId, presence }: Props) {
  const isOnline = (id: string) => id === myUserId || presence?.[id] === true;
  const sorted = [...members].sort((a, b) => {
    if (a.userId === myUserId) return -1;
    if (b.userId === myUserId) return 1;
    const on = Number(isOnline(b.userId)) - Number(isOnline(a.userId));
    return on !== 0 ? on : a.name.localeCompare(b.name);
  });
  const onlineCount = presence ? members.filter((m) => isOnline(m.userId)).length : null;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Who’s here"
      subtitle={
        onlineCount === null
          ? `${members.length} ${members.length === 1 ? 'member' : 'members'}`
          : `${members.length} members · ${onlineCount} online now`
      }
    >
      <ul className="flex flex-col gap-2" aria-label="Members">
        {sorted.map((m) => {
          const name = m.name || 'Family member';
          const online = isOnline(m.userId);
          return (
            <li key={m.userId} className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-2">
              <span className="relative">
                <Avatar id={m.userId} name={name} size={44} />
                {presence && (
                  <span
                    aria-hidden="true"
                    className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-surface ${
                      online ? 'bg-green' : 'bg-line-strong'
                    }`}
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">
                  {name}
                  {m.userId === myUserId && <span className="font-semibold text-ink-muted"> (you)</span>}
                </span>
                {m.isOwner && <span className="block text-ink-muted">Started this room</span>}
              </span>
              {presence && (
                <span className={`shrink-0 font-semibold ${online ? 'text-green' : 'text-ink-muted'}`}>
                  {online ? 'Online' : 'Offline'}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {!presence && (
        <p className="mt-4 text-ink-muted">Online status is not available right now.</p>
      )}
    </Sheet>
  );
}
