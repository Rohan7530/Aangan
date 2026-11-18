// Sessions are kept so a refresh reconnects as the same user.
//
// Tabs in one browser share localStorage, so a single "current session" key would
// make every new tab become the last user who logged in. Instead:
//   - localStorage  holds every saved session { userId, token, name, ... }, keyed by userId
//   - sessionStorage (per tab, survives refresh) holds which userId THIS tab is
// A brand-new tab therefore shows the login page, with "continue as" shortcuts.

import type { NexconnAreaCode } from './nexconn/types';

export interface Session {
  userId: string;
  name: string;
  token: string;
  appKey: string;
  areaCode: NexconnAreaCode;
  channelId: string;
  channelName: string;
}

const SAVED_KEY = 'aangan.sessions'; // localStorage: Record<userId, Session>
const TAB_KEY = 'aangan.tabUserId'; // sessionStorage: userId of this tab

function isSession(s: unknown): s is Session {
  const v = s as Partial<Session> | null;
  return !!(v && v.userId && v.token && v.appKey && v.areaCode && v.channelId && v.name);
}

function readSaved(): Record<string, Session> {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const out: Record<string, Session> = {};
    for (const [id, s] of Object.entries(parsed)) if (isSession(s)) out[id] = s;
    return out;
  } catch {
    return {};
  }
}

function writeSaved(all: Record<string, Session>): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(all));
  } catch {
    // private mode or blocked storage: sessions simply will not survive a refresh
  }
}

// The session this tab was using before a refresh, if any.
export function loadSession(): Session | null {
  try {
    const userId = sessionStorage.getItem(TAB_KEY);
    return userId ? readSaved()[userId] ?? null : null;
  } catch {
    return null;
  }
}

// Other users saved in this browser, for "continue as" on the login page.
export function listSavedSessions(): Session[] {
  return Object.values(readSaved());
}

// Drop sessions saved for a different (older) room ID, e.g. after the family
// channel was changed in .env. Those users are not members of the new room.
export function forgetOtherRooms(channelId: string): void {
  const all = readSaved();
  const kept = Object.fromEntries(Object.entries(all).filter(([, s]) => s.channelId === channelId));
  if (Object.keys(kept).length !== Object.keys(all).length) writeSaved(kept);
}

export function saveSession(session: Session): void {
  writeSaved({ ...readSaved(), [session.userId]: session });
  try {
    sessionStorage.setItem(TAB_KEY, session.userId);
  } catch {
    // ignore
  }
}

// Leave: this tab forgets its user, and the saved session is removed.
export function clearSession(userId?: string): void {
  try {
    sessionStorage.removeItem(TAB_KEY);
  } catch {
    // ignore
  }
  if (userId) {
    const all = readSaved();
    delete all[userId];
    writeSaved(all);
  }
}
