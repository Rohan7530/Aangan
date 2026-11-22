// Calls to the Aangan server (the same backend as the website).
// The phone never talks to Nexconn's REST API and never sees the App Secret.

import { API_URL } from './config';

export type Lang = 'en' | 'hi' | 'mr' | 'ta' | 'bn';
export type DemoPersona = 'dadi' | 'arjun' | 'papa' | 'meera';

export interface Session {
  userId: string;
  name: string;
  token: string;
  /** Key for our own server's APIs (not a Nexconn credential). */
  authKey: string;
  appKey: string;
  areaCode: string;
  channelId: string;
  channelName: string;
  /** Set when signed in as one of the demo family. */
  persona?: DemoPersona;
  mode?: 'standard' | 'comfort';
  language?: Lang;
}

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
}

/** Network trouble (server asleep, wrong Wi-Fi): shown as "cannot reach". */
export class Unreachable extends Error {}

async function call<T>(path: string, init: { method?: string; body?: unknown; authKey?: string } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? (init.body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        ...(init.authKey ? { Authorization: `Bearer ${init.authKey}` } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new Unreachable('Cannot reach the Aangan server');
  } finally {
    clearTimeout(timer);
  }
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Something went wrong (HTTP ${res.status})`);
  return body;
}

export function health() {
  return call<{ ok: boolean }>('/api/health');
}

export function login(name: string) {
  return call<Session>('/api/login', { body: { name } });
}

export async function demoSession(persona: DemoPersona): Promise<Session> {
  const s = await call<Session>('/api/demo/session', { body: { persona } });
  return { ...s, persona };
}

/** "Is this safe?": a message the reader got elsewhere (SMS, WhatsApp, a call). */
export function shieldCheck(authKey: string, text: string, lang: Lang) {
  return call<ShieldVerdict>('/api/shield/check', { authKey, body: { text, lang } });
}

/** "Ask my family": posts the message and verdict in a private room with the trusted person. */
export function askFamily(
  authKey: string,
  params: { guardianId: string; text: string; level?: ShieldVerdict['level']; category?: string | null },
) {
  return call<{ ok: true; channelId: string; guardianName: string }>('/api/shield/ask-family', { authKey, body: params });
}

// Who each demo persona asks. Demo user IDs are <demo room ID><persona> on the server.
const DEMO_GUARDIAN: Record<DemoPersona, { key: DemoPersona; name: string }> = {
  dadi: { key: 'arjun', name: 'Arjun' },
  papa: { key: 'arjun', name: 'Arjun' },
  arjun: { key: 'papa', name: 'Papa' },
  meera: { key: 'papa', name: 'Papa' },
};

/** The trusted person for "Ask my family" (demo family only for now). */
export function demoGuardian(session: Session): { userId: string; name: string } | null {
  if (!session.persona) return null;
  const g = DEMO_GUARDIAN[session.persona];
  return { userId: `${session.channelId}${g.key}`.slice(0, 64), name: g.name };
}
