// Calls to our own server. The browser never talks to Nexconn's REST API.

import type { Session } from './session';

export interface RoomConfig {
  channelId: string;
  channelName: string;
}

export async function getRoomConfig(): Promise<RoomConfig> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error(`Config failed (HTTP ${res.status})`);
  return (await res.json()) as RoomConfig;
}

// Sign in. With the authKey of a user who signed in on this browser before,
// the server reuses that user (same userId) instead of creating a new one.
export async function login(name: string, authKey?: string): Promise<Session> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(authKey ? { name, authKey } : { name }),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<Session> & { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? `Login failed (HTTP ${res.status})`);
  }
  return body as Session;
}

export type DemoPersona = 'arjun' | 'dadi' | 'papa' | 'meera';

export interface DemoSession extends Session {
  mode: 'standard' | 'comfort';
  label: string;
  language?: 'en' | 'hi' | 'mr' | 'ta' | 'bn';
}

// No-login session as one of the demo family, in the demo room only.
export async function getDemoSession(persona: DemoPersona): Promise<DemoSession> {
  const res = await fetch('/api/demo/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ persona }),
  });
  const body = (await res.json().catch(() => ({}))) as Partial<DemoSession> & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Demo failed (HTTP ${res.status})`);
  return body as DemoSession;
}

// ---- rooms + invites (our server; authKey identifies the caller) -----------------

async function call<T>(path: string, init: RequestInit & { authKey?: string } = {}): Promise<T> {
  const { authKey, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(authKey ? { Authorization: `Bearer ${authKey}` } : {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Request failed (HTTP ${res.status})`);
  return body;
}

export function createRoom(authKey: string, name: string) {
  return call<{ channelId: string; name: string; invitePath: string }>('/api/rooms', {
    method: 'POST',
    authKey,
    body: JSON.stringify({ name }),
  });
}

export function getRoomInvite(authKey: string, channelId: string) {
  return call<{ name: string; invitePath: string }>(`/api/rooms/${encodeURIComponent(channelId)}/invite`, { authKey });
}

export function getInviteInfo(code: string) {
  return call<{ name: string }>(`/api/invites/${encodeURIComponent(code)}`);
}

export function joinInvite(authKey: string, code: string) {
  return call<{ channelId: string; name: string }>(`/api/invites/${encodeURIComponent(code)}/join`, {
    method: 'POST',
    authKey,
  });
}
