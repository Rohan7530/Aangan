// Group info for the chat header. Added alongside client.ts; still the only
// place (with client.ts) that imports the Nexconn SDK.
// API names verified against node_modules/@nexconn/chat/index.d.ts (v26.2.1):
//   GroupChannel.getGroupsInfo(ids) -> GroupInfo[] with membersCount
//   NCEngine.addGroupChannelHandler + GroupChannelHandler.onGroupOperation

import { GroupChannel, GroupChannelHandler, GroupMemberRole, NCEngine } from '@nexconn/chat';

export interface Member {
  userId: string;
  /** Name Nexconn stores for the user (set when the server issued their token). */
  name: string;
  isOwner: boolean;
}

// Everyone in the room. Docs: /chatsdk-web/group-channel/group-member-manager.md
// (GroupChannel.createGroupMembersByRoleQuery). UNDEF = no role filter.
export async function listMembers(channelId: string): Promise<{ ok: boolean; code: number; members: Member[] }> {
  const query = GroupChannel.createGroupMembersByRoleQuery({
    groupId: channelId,
    role: GroupMemberRole.UNDEF,
    pageSize: 100,
  });
  const res = await query.loadNextPage();
  const rows = res.data?.data ?? [];
  return {
    ok: res.isOk,
    code: res.code,
    members: rows.map((m) => ({
      userId: m.userId,
      name: m.nickname || m.name || '',
      isOwner: m.role === GroupMemberRole.OWNER,
    })),
  };
}

let groupHandlerSeq = 0;

// Number of members in a group channel, or null if it could not be read.
export async function getMemberCount(channelId: string): Promise<number | null> {
  const res = await GroupChannel.getGroupsInfo([channelId]);
  if (!res.isOk) return null;
  const count = res.data?.[0]?.membersCount;
  return typeof count === 'number' ? count : null;
}

// Calls cb when someone joins, leaves, or is removed from the group.
export function onMembersChanged(channelId: string, cb: () => void): () => void {
  const id = `aangan-group-${++groupHandlerSeq}`;
  NCEngine.addGroupChannelHandler(
    id,
    new GroupChannelHandler({
      onGroupOperation(event) {
        if (event.groupId === channelId) cb();
      },
    }),
  );
  return () => NCEngine.removeGroupChannelHandler(id);
}
