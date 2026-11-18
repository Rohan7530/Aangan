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

export async function login(name: string): Promise<Session> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
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
