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

// ---- AI features (our server proxies the Python AI service) ----------------------

export type ReaderLang = 'en' | 'hi' | 'mr' | 'ta' | 'bn';

export interface ShieldVerdict {
  level: 'safe' | 'caution' | 'danger';
  score: number;
  category: string | null;
  signals: string[];
  /** Short heading in the reader's language. */
  title: string;
  /** Up to three plain sentences in the reader's language. */
  advice: string[];
  explanation: string | null;
  engine: 'rules' | 'ai';
  cached: boolean;
}

/** Background check of a message someone sent in a room. */
export function shieldScan(authKey: string, text: string, lang: ReaderLang) {
  return call<ShieldVerdict>('/api/shield/scan', { method: 'POST', authKey, body: JSON.stringify({ text, lang }) });
}

/** "Is this safe?": a message the reader got elsewhere (SMS, WhatsApp, a call). */
export function shieldCheck(authKey: string, text: string, lang: ReaderLang) {
  return call<ShieldVerdict>('/api/shield/check', { method: 'POST', authKey, body: JSON.stringify({ text, lang }) });
}

/** "Ask my family": posts the message and verdict in a private room with the trusted person. */
export function askFamily(authKey: string, params: { guardianId: string; text: string; level?: ShieldVerdict['level']; category?: string | null }) {
  return call<{ ok: true; channelId: string; guardianName: string }>('/api/shield/ask-family', {
    method: 'POST',
    authKey,
    body: JSON.stringify(params),
  });
}

export interface Summary {
  lines: string[];
  spoken: string;
  engine: 'ai' | 'fallback';
}

export function aiSummary(authKey: string, lang: ReaderLang, reader: string, messages: { sender: string; text: string; at: number }[]) {
  return call<Summary>('/api/ai/summary', { method: 'POST', authKey, body: JSON.stringify({ lang, reader, messages }) });
}

export function aiReplies(authKey: string, lang: ReaderLang, text: string, sender: string | null) {
  return call<{ replies: string[]; engine: 'ai' | 'fallback' }>('/api/ai/replies', {
    method: 'POST',
    authKey,
    body: JSON.stringify({ lang, text, sender }),
  });
}
