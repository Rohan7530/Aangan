// Online/offline presence for room members.
// Docs: /chatsdk-web/user/subscribe_online.md ("may require the feature to be
// enabled on the Console"). Types verified in index.d.ts (v26.2.1):
//   NCEngine.userModule.subscribeEvent({ userIds, subscribeType: SubscribeType.ONLINE_STATUS })
//   NCEngine.userModule.getSubscribeUsersOnlineStatus(userIds) -> { userId, isOnline }[]
//   UserHandler.onSubscriptionChanged

import { NCEngine, SubscribeType, UserHandler } from '@nexconn/chat';

let seq = 0;

export type PresenceMap = Record<string, boolean>;

export interface PresenceWatch {
  ok: boolean;
  /** Nexconn status code when subscribing failed (e.g. feature not enabled). */
  code: number;
  stop: () => void;
}

async function readStatus(userIds: string[]): Promise<PresenceMap | null> {
  const res = await NCEngine.userModule.getSubscribeUsersOnlineStatus(userIds);
  if (!res.isOk || !res.data) return null;
  const map: PresenceMap = {};
  for (const s of res.data) map[s.userId] = s.isOnline;
  return map;
}

// Subscribe to the members' online status and call cb with the full map on
// every change. Returns ok=false with the Nexconn code if presence is unavailable.
export async function watchPresence(userIds: string[], cb: (map: PresenceMap) => void): Promise<PresenceWatch> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return { ok: true, code: 0, stop: () => {} };

  // NOTE: the docs say `expiry` can be omitted and the type comment says 0 = no
  // expiry, but the engine (v26.2.1) rejects both with 34307
  // (INVALID_PARAMETER_SUBSCRIBE_EXPIRY): it requires an integer from 60 to
  // 2,592,000 seconds. We subscribe for one day and re-subscribe on each load.
  const sub = await NCEngine.userModule.subscribeEvent({
    userIds: ids,
    subscribeType: SubscribeType.ONLINE_STATUS,
    expiry: 86_400,
  });
  if (!sub.isOk) return { ok: false, code: sub.code, stop: () => {} };

  const handlerId = `aangan-presence-${++seq}`;
  const refresh = () => {
    readStatus(ids).then((map) => map && cb(map));
  };
  NCEngine.addUserHandler(
    handlerId,
    new UserHandler({
      onSubscriptionChanged() {
        refresh();
      },
    }),
  );
  refresh();
  return { ok: true, code: 0, stop: () => NCEngine.removeUserHandler(handlerId) };
}
