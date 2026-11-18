// The room list ("my rooms") with last message and unread count. Part of the
// Nexconn layer. Docs + verified live:
//   - joined groups:  GroupChannel.createJoinedGroupsByRoleQuery({ role: UNDEF })  (/chatsdk-web/group-channel/group-info.md)
//   - channel list:   BaseChannel.createChannelsQuery -> unreadCount, latestMessage (/chatsdk-web/channel/get-list.md)
//   - one channel:    new GroupChannel(id).reload() -> fresh unreadCount + latestMessage
//   - clear unread:   channel.clearUnreadCount()  (/chatsdk-web/channel/syncReadStatus.md)

import { BaseChannel, ChannelType, GroupChannel, GroupMemberRole } from '@nexconn/chat';
import { loadRichHistory, toRich, type RichMessage } from './rich';

export interface RoomSummary {
  channelId: string;
  name: string;
  memberCount: number;
  unread: number;
  last: RichMessage | null;
}

async function joinedGroups(): Promise<{ channelId: string; name: string; memberCount: number }[]> {
  const query = GroupChannel.createJoinedGroupsByRoleQuery({ role: GroupMemberRole.UNDEF, pageSize: 50 });
  const out: { channelId: string; name: string; memberCount: number }[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await query.loadNextPage();
    if (!res.isOk) throw new Error(`Rooms failed (code ${res.code})`);
    const rows = (res.data as unknown as { data?: { groupId: string; groupName: string; membersCount?: number }[] })?.data ?? [];
    for (const g of rows) out.push({ channelId: g.groupId, name: g.groupName, memberCount: g.membersCount ?? 0 });
    if (rows.length < 50) break;
  }
  return out;
}

async function channelStates(): Promise<Map<string, { unread: number; last: RichMessage | null }>> {
  const map = new Map<string, { unread: number; last: RichMessage | null }>();
  const res = await BaseChannel.createChannelsQuery({ pageSize: 50 }).loadNextPage();
  if (!res.isOk) return map;
  const rows = (res.data as unknown as { data?: BaseChannel[] })?.data ?? [];
  for (const ch of rows) {
    if (ch.channelType !== ChannelType.GROUP) continue;
    map.set(ch.channelId, { unread: ch.unreadCount, last: ch.latestMessage ? toRich(ch.latestMessage) : null });
  }
  return map;
}

// Every group I am in, with its last message and unread count.
export async function listRooms(): Promise<RoomSummary[]> {
  const [groups, states] = await Promise.all([joinedGroups(), channelStates()]);
  return groups.map((g) => ({ ...g, unread: states.get(g.channelId)?.unread ?? 0, last: states.get(g.channelId)?.last ?? null }));
}

// Preview for a room joined after its last message (no channel entry yet):
// the newest message from history.
export async function loadPreview(channelId: string): Promise<RichMessage | null> {
  const page = await loadRichHistory(channelId, { pageSize: 1 });
  return page[page.length - 1] ?? null;
}

// Fresh unread count + last message for one room, straight from the SDK.
export async function getRoomState(channelId: string): Promise<{ unread: number; last: RichMessage | null } | null> {
  const res = await new GroupChannel(channelId).reload();
  if (!res.isOk || !res.data) return null;
  return { unread: res.data.unreadCount, last: res.data.latestMessage ? toRich(res.data.latestMessage) : null };
}

export async function clearUnread(channelId: string): Promise<void> {
  await new GroupChannel(channelId).clearUnreadCount();
}
