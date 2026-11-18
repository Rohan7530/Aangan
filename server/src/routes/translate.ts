import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Router } from 'express';
import { byAuthOrIp, rateLimit } from '../rateLimit.js';
import { userByKey } from '../store.js';
import { LANGS, llmTranslate, loadTranslateConfig, type Lang, type LlmResult } from '../translate/engine.js';

// /api/translate: the optional "llm" engine. Off (llm:false) when no
// TRANSLATE_API_KEY is set. Results are cached in server/data per message
// content + target language, so each message is translated (and charged) once
// per language. The cache key is a hash of the TEXT, not a client-supplied id,
// so nobody can overwrite the translation of someone else's message.

const DATA_DIR = new URL('../../data/', import.meta.url);
const FILE = new URL(process.env.TRANSLATE_MOCK === '1' ? 'translations.mock.json' : 'translations.json', DATA_DIR);
type Cache = Record<string, LlmResult & { at: string }>;
let cache: Cache | null = null;
let writing: Promise<void> = Promise.resolve();
const inflight = new Map<string, Promise<LlmResult>>();

async function load(): Promise<Cache> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(FILE, 'utf8')) as Cache;
  } catch {
    cache = {};
  }
  return cache;
}
function save() {
  writing = writing.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(FILE, JSON.stringify(cache));
  });
}
const keyFor = (text: string, lang: Lang) => `${createHash('sha256').update(text).digest('hex').slice(0, 32)}|${lang}`;

const cfgOnce = loadTranslateConfig();

// Cached translation, shared by the route and by demo pre-warming.
// Returns null when the llm engine is off.
export async function translateCached(text: string, target: Lang): Promise<(LlmResult & { cached: boolean }) | null> {
  if (!cfgOnce) return null;
  const c = await load();
  const k = keyFor(text, target);
  const hit = c[k];
  if (hit) return { translated: hit.translated, sourceLang: hit.sourceLang, cached: true };
  let p = inflight.get(k);
  if (!p) {
    p = llmTranslate(cfgOnce, text, target);
    inflight.set(k, p);
  }
  const r = await p.finally(() => inflight.delete(k));
  c[k] = { ...r, at: new Date().toISOString() };
  save();
  return { ...r, cached: false };
}

export function translateRouter(): Router {
  const router = Router();
  const cfg = cfgOnce;
  console.log(cfg?.provider === 'mock' ? '[translate] llm engine MOCKED for tests (no network calls)' : cfg ? `[translate] llm engine on (${cfg.provider}, ${cfg.model})` : '[translate] llm engine off (no TRANSLATE_API_KEY)');

  // Tells the browser which engine to use. Never includes the key.
  router.get('/translate/config', (_req, res) => {
    res.json(cfg?.provider === 'mock' ? { llm: true, mock: true } : { llm: cfg !== null });
  });

  router.post(
    '/translate',
    rateLimit({ windowMs: 60_000, max: 120, key: byAuthOrIp, message: 'Too many translations at once. Please wait a moment.' }),
    async (req, res) => {
      const auth = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
      if (!auth || !(await userByKey(auth))) {
        res.status(401).json({ error: 'Please join again.' });
        return;
      }
      if (!cfg) {
        res.status(409).json({ error: 'llm engine is off' });
        return;
      }
      const text = typeof req.body?.text === 'string' ? req.body.text : '';
      const target = req.body?.target as Lang;
      if (!text.trim() || text.length > 2000 || !LANGS.includes(target)) {
        res.status(400).json({ error: 'Bad request' });
        return;
      }
      try {
        const r = (await translateCached(text, target))!;
        res.json({ translated: r.translated, sourceLang: r.sourceLang, engine: 'llm', cached: r.cached });
      } catch (err) {
        console.warn('[translate] failed:', err instanceof Error ? err.message : err);
        res.status(502).json({ error: 'Translation is not available right now.' });
      }
    },
  );

  return router;
}
