// My display name in Nexconn. Added alongside client.ts; only this folder imports the SDK.
// Verified live (2026-11-18, SDK 26.2.1):
//   NCEngine.userModule.updateMyUserProfile({ name })   -> ok (code 0)
//     (custom extProfile keys fail with 24362 RC_USER_PROFILE_EXT_KEY_NOT_EXIST
//      unless declared in the console, so the avatar colour is kept on our server)
//   GroupChannel#setMemberInfo({ userId, nickname })   -> ok; member lists show the nickname
// Docs: /chatsdk-web/user/user-profile.md, /chatsdk-web/group-channel/group-member-manager.md

import { GroupChannel, NCEngine } from '@nexconn/chat';

export async function updateMyName(name: string): Promise<{ ok: boolean; code: number }> {
  const r = await NCEngine.userModule.updateMyUserProfile({ name });
  return { ok: r.isOk, code: r.code };
}

// Set my nickname in each room, so member lists everywhere show the new name.
export async function setMyNickname(channelIds: string[], userId: string, nickname: string): Promise<{ failed: string[] }> {
  const failed: string[] = [];
  await Promise.all(
    channelIds.map(async (id) => {
      try {
        const r = await new GroupChannel(id).setMemberInfo({ userId, nickname });
        if (!r.isOk) failed.push(id);
      } catch {
        failed.push(id);
      }
    }),
  );
  return { failed };
}
