import type { RoomSummary } from '../../nexconn/rooms';
import { formatListTime, senderLabel } from '../messageModel';
import { Sheet } from '../Sheet';
import { RoomAvatar } from '../workspace/RoomAvatar';

interface Props {
  open: boolean;
  onClose: () => void;
  rooms: RoomSummary[];
  activeId: string;
  myId: string;
  onSelect: (channelId: string) => void;
}

// Comfort: every room as a big, labelled row ("3 new messages").
export function MyRoomsSheet({ open, onClose, rooms, activeId, myId, onSelect }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="My rooms" subtitle="Choose a room to open.">
      <ul className="flex flex-col gap-3">
        {rooms.map((r) => {
          const active = r.channelId === activeId;
          const who = r.last ? (r.last.senderId === myId ? 'You' : senderLabel(r.last)) : null;
          const what = r.last ? (r.last.kind === 'image' ? 'sent a photo' : r.last.text) : 'No messages yet';
          return (
            <li key={r.channelId}>
              <button
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => {
                  onSelect(r.channelId);
                  onClose();
                }}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left ${
                  active ? 'border-green bg-green-soft' : 'border-line bg-white hover:border-line-strong'
                }`}
                style={{ minHeight: 88 }}
              >
                <RoomAvatar id={r.channelId} name={r.name} size={56} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[1.375rem] font-bold leading-tight">{r.name}</span>
                  <span className="mt-1 block truncate text-[1.125rem] text-ink-muted">
                    {who ? `${who}: ${what}` : what}
                  </span>
                  {r.last && <span className="block text-[1.125rem] text-ink-muted">{formatListTime(r.last.sentAt)}</span>}
                </span>
                {r.unread > 0 && (
                  <span className="shrink-0 rounded-2xl bg-terracotta px-3 py-1 text-[1.125rem] font-bold text-white">
                    {r.unread} new
                  </span>
                )}
                {active && <span className="shrink-0 font-semibold text-green">Open now</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
