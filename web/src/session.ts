// One signed-in user per browser, kept until they sign out.
//
//   localStorage "aangan.session"     the current Session (token, authKey, ...)
//   localStorage "aangan.identities"  everyone who has signed in on this browser:
//                                     { userId, name, authKey }. Kept after sign-out,
//                                     so signing in again with the same name reuses
//                                     the same user instead of creating a new member.

import type { NexconnAreaCode } from './nexconn/types';

export interface Session {
  userId: string;
  name: string;
  token: string;
  /** Key for our own server's room/invite APIs (not a Nexconn credential). */
  authKey: string;
  appKey: string;
  areaCode: NexconnAreaCode;
  channelId: string;
  channelName: string;
}

export interface Identity {
  userId: string;
  name: string;
  authKey: string;
}

const SESSION_KEY = 'aangan.session';
const IDENTITIES_KEY = 'aangan.identities';
const LEGACY_SAVED = 'aangan.sessions'; // older builds: Record<userId, Session>
const LEGACY_TAB = 'aangan.tabUserId'; // older builds: sessionStorage

function isSession(s: unknown): s is Session {
  const v = s as Partial<Session> | null;
  return !!(v && v.userId && v.token && v.authKey && v.appKey && v.areaCode && v.channelId && v.name);
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode or blocked storage: the session simply will not survive a reload
  }
}

function readIdentities(): Record<string, Identity> {
  const raw = read<Record<string, Partial<Identity>>>(IDENTITIES_KEY) ?? {};
  const out: Record<string, Identity> = {};
  for (const [id, v] of Object.entries(raw)) if (v?.userId && v.name && v.authKey) out[id] = v as Identity;
  return out;
}

function remember(s: Identity): void {
  write(IDENTITIES_KEY, { ...readIdentities(), [s.userId]: { userId: s.userId, name: s.name, authKey: s.authKey } });
}

// Older builds kept one saved session per user plus a per-tab pointer.
// Turn those into identities (so their names are reused) and keep the tab's user signed in.
function migrate(): void {
  const legacy = read<Record<string, unknown>>(LEGACY_SAVED);
  if (!legacy) return;
  for (const s of Object.values(legacy)) if (isSession(s)) remember(s);
  let tabUser: string | null = null;
  try {
    tabUser = sessionStorage.getItem(LEGACY_TAB);
    sessionStorage.removeItem(LEGACY_TAB);
  } catch {
    // ignore
  }
  const current = tabUser ? legacy[tabUser] : null;
  if (isSession(current) && !read(SESSION_KEY)) write(SESSION_KEY, current);
  write(LEGACY_SAVED, null);
}

// The signed-in user for this browser, if any (only for the current family room).
export function loadSession(channelId?: string): Session | null {
  migrate();
  const s = read<unknown>(SESSION_KEY);
  if (!isSession(s)) return null;
  if (channelId && s.channelId !== channelId) return null; // family room changed in .env
  return s;
}

export function saveSession(session: Session): void {
  write(SESSION_KEY, session);
  remember(session);
}

// Sign out: forget the session (the identity stays, so the name is reused next time).
export function clearSession(): void {
  write(SESSION_KEY, null);
}

// Everyone who has used Aangan on this browser, newest name first.
export function listIdentities(): Identity[] {
  migrate();
  return Object.values(readIdentities());
}

// The existing user for a name typed on the sign-in page (case and spacing ignored).
export function identityForName(name: string): Identity | null {
  const norm = (n: string) => n.trim().replace(/\s+/g, ' ').toLowerCase();
  return listIdentities().find((i) => norm(i.name) === norm(name)) ?? null;
}

// After a name change.
export function renameIdentity(userId: string, name: string): void {
  const s = loadSession();
  if (s && s.userId === userId) write(SESSION_KEY, { ...s, name });
  const all = readIdentities();
  if (all[userId]) write(IDENTITIES_KEY, { ...all, [userId]: { ...all[userId], name } });
}

// The room a user had open last, so a refresh (or an invite) opens it again.
const lastRoomKey = (userId: string) => `aangan.lastRoom.${userId}`;
export function getLastRoom(userId: string): string | null {
  try {
    return localStorage.getItem(lastRoomKey(userId));
  } catch {
    return null;
  }
}
export function setLastRoom(userId: string, channelId: string): void {
  try {
    localStorage.setItem(lastRoomKey(userId), channelId);
  } catch {
    // ignore
  }
}
