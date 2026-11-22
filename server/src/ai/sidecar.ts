// Runs and supervises the Python AI service (ai/, FastAPI) and talks to it.
//
// - By default the server starts it as a child process on 127.0.0.1:AI_PORT
//   (default 8001), using ai/.venv's Python when it exists. If it crashes it
//   is restarted with a growing delay (1 s ... 30 s).
// - AI_SIDECAR_URL=http://host:port uses an already running service instead.
// - Every call carries X-Internal-Token. The token comes from AI_INTERNAL_TOKEN
//   or is derived from the App Secret, so it is stable across dev restarts and
//   never leaves the machine.
// - Callers get AiUnavailable when the service is down or slow; routes turn
//   that into a calm fallback instead of an error page.

import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const AI_DIR = fileURLToPath(new URL('../../../ai/', import.meta.url));

export class AiUnavailable extends Error {}

export type AiStatus = 'off' | 'starting' | 'up' | 'down';

interface Health {
  ok: boolean;
  llm: string;
  model: string | null;
}

let status: AiStatus = 'off';
let health: Health | null = null;
let baseUrl = '';
let token = '';
let child: ChildProcess | null = null;
let restartDelay = 1_000;
let stopping = false;
let external = false;

// Tests (TRANSLATE_MOCK=1 / AI_MOCK=1) get their own port and must only ever
// talk to a mocked service, never one that would call a real provider.
const MOCK = process.env.TRANSLATE_MOCK === '1' || process.env.AI_MOCK === '1';
const defaultPort = () => Number(process.env.AI_PORT ?? (MOCK ? 8002 : 8001));

function pythonPath(): string {
  if (process.env.AI_PYTHON?.trim()) return process.env.AI_PYTHON.trim();
  const win = `${AI_DIR}.venv/Scripts/python.exe`;
  const nix = `${AI_DIR}.venv/bin/python`;
  if (existsSync(win)) return win;
  if (existsSync(nix)) return nix;
  return process.platform === 'win32' ? 'python' : 'python3';
}

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(2_000) });
    if (!res.ok) return false;
    health = (await res.json()) as Health;
    if (MOCK && health.llm !== 'mock') {
      console.error(`[ai] refusing ${baseUrl}: tests need the mocked service, this one uses "${health.llm}"`);
      return false;
    }
    return health.ok === true;
  } catch {
    return false;
  }
}

async function waitUntilUp(): Promise<void> {
  for (let i = 0; i < 60 && !stopping; i++) {
    if (await checkHealth()) {
      if (status !== 'up') console.log(`[ai] service up at ${baseUrl} (llm: ${health?.llm}${health?.model ? `, ${health.model}` : ''})`);
      status = 'up';
      restartDelay = 1_000;
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (status !== 'up') {
    status = 'down';
    console.warn('[ai] service did not become healthy; AI features will use their simple fallbacks');
  }
}

function launch() {
  const port = defaultPort();
  const py = pythonPath();
  status = 'starting';
  child = spawn(py, ['-m', 'uvicorn', 'aangan_ai.main:app', '--host', '127.0.0.1', '--port', String(port), '--log-level', 'warning'], {
    cwd: AI_DIR,
    env: { ...process.env, AI_INTERNAL_TOKEN: token, AI_PORT: String(port), PYTHONUNBUFFERED: '1', ...(MOCK ? { AI_MOCK: '1' } : {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const prefix = (chunk: Buffer) =>
    chunk
      .toString()
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => console.log(`[ai] ${line.slice(0, 300)}`));
  child.stdout?.on('data', prefix);
  child.stderr?.on('data', prefix);
  child.on('error', (err) => {
    console.warn(`[ai] could not start ${py}: ${err.message}. Run "npm run setup:ai" once.`);
  });
  child.on('exit', (code, signal) => {
    child = null;
    if (stopping) return;
    // On Windows a dev restart can leave the previous service running on the
    // port, so ours cannot bind. If a healthy service answers, adopt it.
    void checkHealth().then((up) => {
      if (up) {
        status = 'up';
        console.log(`[ai] using the service already running at ${baseUrl}`);
        return;
      }
      status = 'down';
      console.warn(`[ai] service exited (${signal ?? code}); restarting in ${restartDelay / 1000}s`);
      setTimeout(launch, restartDelay);
      restartDelay = Math.min(restartDelay * 2, 30_000);
    });
  });
  void waitUntilUp();
}

export function startAiSidecar(appSecret: string): void {
  token = process.env.AI_INTERNAL_TOKEN?.trim() || createHash('sha256').update(`aangan-ai:${appSecret}`).digest('hex');
  const url = process.env.AI_SIDECAR_URL?.trim();
  if (url) {
    external = true;
    baseUrl = url.replace(/\/+$/, '');
    status = 'starting';
    void waitUntilUp();
    return;
  }
  baseUrl = `http://127.0.0.1:${defaultPort()}`;
  // A service left running by a previous dev restart is reused (same token).
  void checkHealth().then((alreadyUp) => {
    if (alreadyUp) {
      status = 'up';
      console.log(`[ai] reusing service already running at ${baseUrl} (llm: ${health?.llm})`);
    } else {
      launch();
    }
  });
  const stop = () => {
    stopping = true;
    child?.kill();
  };
  process.once('exit', stop);
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.once(sig, () => {
      stop();
      process.exit(0);
    });
  }
}

export function aiStatus(): { status: AiStatus; llm: string | null } {
  return { status, llm: health?.llm ?? null };
}

// POST to the AI service. Throws AiUnavailable on network errors, timeouts and
// 5xx; returns { status, body } for 4xx so routes can pass validation errors on.
export async function callAi<T>(path: string, body: unknown, timeoutMs = 25_000): Promise<T> {
  if (!baseUrl) throw new AiUnavailable('AI service not configured');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': token },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    // Connection refused: it is restarting, or an adopted service went away.
    if (status === 'up') {
      status = 'down';
      if (!external && !child && !stopping) launch();
      else void waitUntilUp();
    }
    throw new AiUnavailable(err instanceof Error ? err.message : 'AI service unreachable');
  }
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status >= 500) throw new AiUnavailable(`AI service ${res.status}`);
  if (!res.ok) throw new AiBadRequest(res.status, json.error ?? 'Bad request');
  if (status !== 'up') status = 'up';
  return json;
}

export class AiBadRequest extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
