import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RichMessage } from '../nexconn/rich';
import { onRichMessages } from '../nexconn/rich';
import { clearUnread, getRoomState, listRooms, loadPreview, type RoomSummary } from '../nexconn/rooms';
import type { ConnectionState } from '../nexconn/types';

// "My rooms": every group I'm in, with last message + unread count from the SDK,
// kept live: new messages refresh that room's state from Nexconn, and the open
// room's unread count is cleared through the SDK.
export function useRooms(connection: ConnectionState, activeId: string | null) {
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const active = useRef(activeId);
  active.current = activeId;

  const refresh = useCallback(async () => {
    try {
      const list = await listRooms();
      setRooms(list);
      setLoaded(true);
      // Show the list at once; fill in missing previews afterwards.
      for (const r of list.filter((x) => !x.last)) {
        loadPreview(r.channelId)
          .then((last) => last && setRooms((prev) => prev.map((x) => (x.channelId === r.channelId && !x.last ? { ...x, last } : x))))
          .catch(() => undefined);
      }
    } catch (err) {
      console.warn('[rooms] list failed:', err);
    }
  }, []);

  useEffect(() => {
    if (connection === 'connected') void refresh();
  }, [connection, refresh]);

  const patch = useCallback((channelId: string, p: Partial<RoomSummary>) => {
    setRooms((prev) => prev.map((r) => (r.channelId === channelId ? { ...r, ...p } : r)));
  }, []);

  // Record a message I just sent (my own sends do not come back as "received").
  const noteMessage = useCallback((msg: RichMessage) => {
    setRooms((prev) =>
      prev.map((r) => (r.channelId === msg.channelId && (!r.last || r.last.sentAt <= msg.sentAt) ? { ...r, last: msg } : r)),
    );
  }, []);

  // Live: someone wrote in one of my rooms.
  useEffect(() => {
    return onRichMessages((msgs) => {
      const byRoom = new Map<string, RichMessage>();
      for (const m of msgs) {
        const cur = byRoom.get(m.channelId);
        if (!cur || cur.sentAt < m.sentAt) byRoom.set(m.channelId, m);
      }
      for (const [channelId, latest] of byRoom) {
        setRooms((prev) => {
          if (!prev.some((r) => r.channelId === channelId)) {
            void refresh(); // a room I was just added to
            return prev;
          }
          return prev.map((r) => (r.channelId === channelId ? { ...r, last: latest } : r));
        });
        if (channelId === active.current && document.visibilityState === 'visible') {
          void clearUnread(channelId).then(() => patch(channelId, { unread: 0 }));
        } else {
          void getRoomState(channelId).then((s) => s && patch(channelId, { unread: s.unread }));
        }
      }
    });
  }, [refresh, patch]);

  // Opening a room (or coming back to the tab) marks it read.
  useEffect(() => {
    if (!activeId || connection !== 'connected') return;
    const clear = () => {
      if (document.visibilityState !== 'visible') return;
      void clearUnread(activeId).then(() => patch(activeId, { unread: 0 }));
    };
    clear();
    document.addEventListener('visibilitychange', clear);
    return () => document.removeEventListener('visibilitychange', clear);
  }, [activeId, connection, patch]);

  const sorted = useMemo(
    () =>
      [...rooms].sort((a, b) => {
        const ta = a.last?.sentAt ?? 0;
        const tb = b.last?.sentAt ?? 0;
        return tb - ta || a.name.localeCompare(b.name);
      }),
    [rooms],
  );

  return { rooms: sorted, loaded, refresh, noteMessage };
}
