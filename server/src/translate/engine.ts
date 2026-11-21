// The "llm" translation engine (server side only). The API key is read from
// .env here and never sent to the browser: routes return only results.
// Provider is swappable with TRANSLATE_PROVIDER=sarvam | gemini | anthropic.
// With sarvam (key in SARVAM_API_KEY), TRANSLATE_API_KEY serves Gemini as the backup.

import { mockTranslate } from './mock.js';

export const LANGS = ['en', 'hi', 'mr', 'ta', 'bn'] as const;
export type Lang = (typeof LANGS)[number];
export type SourceLang = Lang | 'hinglish' | 'other';

const NAMES: Record<Lang, string> = {
  en: 'English',
  hi: 'Hindi (Devanagari script)',
  mr: 'Marathi (Devanagari script)',
  ta: 'Tamil (Tamil script)',
  bn: 'Bengali (Bengali script)',
};

const SYSTEM = [
  'You translate short messages in a family group chat.',
  "Detect the source language. Hindi written in Latin letters is 'hinglish'.",
  'Translate faithfully into the target language. Keep names, times, dates, numbers and emojis exactly; write digits as they are (keep 9 as 9).',
  'Do not add, explain, soften or summarise anything.',
  'If the message is already in the target language and script, return it unchanged.',
].join(' ');

export interface LlmResult {
  translated: string;
  sourceLang: SourceLang;
}

export interface TranslateConfig {
  provider: 'gemini' | 'anthropic' | 'sarvam' | 'mock';
  apiKey: string;
  model: string;
  /** Tried in order when the main model is overloaded (503/429) or times out. */
  fallbacks: string[];
  /** Tried after all of this provider's models fail (e.g. Gemini behind Sarvam). */
  backup?: TranslateConfig;
}

const DEFAULT_MODEL = { gemini: 'gemini-3.8-flash', anthropic: 'claude-haiku-5-5', sarvam: 'sarvam-105b' } as const;
const DEFAULT_FALLBACKS = { gemini: 'gemini-flash-lite-latest,gemini-3.5-flash-lite', anthropic: '', sarvam: '' } as const;

export function loadTranslateConfig(): TranslateConfig | null {
  // Tests (npm run dev:test) use a local mock and never call a real provider.
  if (process.env.TRANSLATE_MOCK === '1') return { provider: 'mock', apiKey: '', model: 'mock', fallbacks: [] };
  const name = process.env.TRANSLATE_PROVIDER?.trim().toLowerCase();
  const provider = name === 'anthropic' || name === 'sarvam' ? name : 'gemini';
  const translateKey = process.env.TRANSLATE_API_KEY?.trim() ?? '';
  const apiKey = provider === 'sarvam' ? process.env.SARVAM_API_KEY?.trim() || translateKey : translateKey;
  if (!apiKey) return null; // engine simply off
  const model = process.env.TRANSLATE_MODEL?.trim() || DEFAULT_MODEL[provider];
  const fallbacks = (process.env.TRANSLATE_FALLBACK_MODELS ?? DEFAULT_FALLBACKS[provider])
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m && m !== model);
  let backup: TranslateConfig | undefined;
  if (provider === 'sarvam' && translateKey && translateKey !== apiKey) {
    const b = process.env.BACKUP_PROVIDER?.trim().toLowerCase() === 'anthropic' ? 'anthropic' : 'gemini';
    backup = { provider: b, apiKey: translateKey, model: DEFAULT_MODEL[b], fallbacks: DEFAULT_FALLBACKS[b].split(',').filter(Boolean) };
  }
  return { provider, apiKey, model, fallbacks, backup };
}

const SOURCES: SourceLang[] = ['en', 'hi', 'hinglish', 'mr', 'ta', 'bn', 'other'];

function parse(json: string): LlmResult {
  const v = JSON.parse(json) as Partial<LlmResult>;
  if (typeof v.translated !== 'string' || !v.translated.trim()) throw new Error('empty translation');
  return { translated: v.translated.trim(), sourceLang: SOURCES.includes(v.sourceLang as SourceLang) ? (v.sourceLang as SourceLang) : 'other' };
}

async function gemini(cfg: TranslateConfig, model: string, text: string, target: Lang): Promise<LlmResult> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: `Target language: ${NAMES[target]} (code ${target})\nMessage:\n${text}` }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: { sourceLang: { type: 'STRING', enum: SOURCES }, translated: { type: 'STRING' } },
          required: ['sourceLang', 'translated'],
        },
      },
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };
  if (!res.ok) throw new ProviderError(res.status, `gemini ${model} ${res.status}: ${body.error?.message?.slice(0, 120) ?? 'error'}`, JSON.stringify(body).includes('PerDay'));
  const out = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!out) throw new Error('gemini: no output');
  return parse(out);
}

async function anthropic(cfg: TranslateConfig, model: string, text: string, target: Lang): Promise<LlmResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0,
      system: `${SYSTEM} Reply with JSON only: {"sourceLang": one of ${SOURCES.join('|')}, "translated": string}.`,
      messages: [{ role: 'user', content: `Target language: ${NAMES[target]} (code ${target})\nMessage:\n${text}` }],
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { content?: { type: string; text?: string }[]; error?: { message?: string } };
  if (!res.ok) throw new ProviderError(res.status, `anthropic ${model} ${res.status}: ${body.error?.message?.slice(0, 120) ?? 'error'}`);
  const out = body.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
  return parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
}

// Sarvam chat completions (OpenAI-style). reasoning_effort: null turns the model's
// thinking off: ~1 s instead of 3-5 s, same translations in our tests.
async function sarvam(cfg: TranslateConfig, model: string, text: string, target: Lang): Promise<LlmResult> {
  const res = await fetch('https://api.sarvam.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-subscription-key': cfg.apiKey },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1024,
      reasoning_effort: null,
      messages: [
        { role: 'system', content: `${SYSTEM} Reply with JSON only: {"sourceLang": one of ${SOURCES.join('|')}, "translated": string}.` },
        { role: 'user', content: `Target language: ${NAMES[target]} (code ${target})\nMessage:\n${text}` },
      ],
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
  // 402 = credits used up: rest it like a daily quota so the backup takes over.
  if (!res.ok) throw new ProviderError(res.status, `sarvam ${model} ${res.status}: ${body.error?.message?.slice(0, 120) ?? 'error'}`, res.status === 402);
  let out = body.choices?.[0]?.message?.content ?? '';
  if (out.includes('</think>')) out = out.split('</think>').pop() ?? '';
  out = out.trim();
  return parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
}

class ProviderError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly perDay = false,
  ) {
    super(message);
  }
}

// Models that just failed are skipped for a while, so readers don't wait on them:
//   daily quota used up -> 1 hour; model removed (404) -> until restart;
//   overloaded / rate limited / timeout -> 2 minutes.
const resting = new Map<string, number>(); // model -> skip until (ms)
function rest(model: string, err: unknown) {
  let ms = 0;
  if (err instanceof ProviderError) {
    if (err.status === 404) ms = Number.POSITIVE_INFINITY;
    else if (err.status === 401 || err.status === 402 || err.status === 403) ms = 60 * 60_000; // bad key / no credits
    else if (err.status === 429) ms = err.perDay ? 60 * 60_000 : 2 * 60_000;
    else if (err.status >= 500) ms = 2 * 60_000;
  } else if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
    ms = 2 * 60_000;
  }
  if (ms) resting.set(model, Date.now() + ms);
  return ms > 0;
}

// Reject answers that did not actually translate: the same text back when the
// languages differ, or text in the wrong script for the target language.
const SCRIPT: Record<Lang, RegExp> = {
  en: /[A-Za-z]/g,
  hi: /[\u0900-\u097F]/g,
  mr: /[\u0900-\u097F]/g,
  ta: /[\u0B80-\u0BFF]/g,
  bn: /[\u0980-\u09FF]/g,
};
export function looksTranslated(text: string, target: Lang, r: LlmResult): boolean {
  const letters = r.translated.match(/\p{L}/gu)?.length ?? 0;
  if (letters === 0) return true; // numbers / emoji only
  const inTarget = r.translated.match(SCRIPT[target])?.length ?? 0;
  if (inTarget / letters < 0.6) return false;
  const sameLang = r.sourceLang === target;
  return sameLang || r.translated.trim() !== text.trim();
}

class BadOutput extends Error {}

// Main model first, then its fallbacks, then the backup provider's models,
// skipping models that are resting.
export async function llmTranslate(cfg: TranslateConfig, text: string, target: Lang): Promise<LlmResult> {
  if (cfg.provider === 'mock') return mockTranslate(text, target);
  const all: { c: TranslateConfig; model: string; key: string }[] = [];
  for (let c: TranslateConfig | undefined = cfg; c; c = c.backup) {
    for (const model of [c.model, ...c.fallbacks]) all.push({ c, model, key: `${c.provider}:${model}` });
  }
  const ready = all.filter((m) => (resting.get(m.key) ?? 0) <= Date.now());
  const order = ready.length ? ready : all; // everything resting: try anyway
  let last: unknown;
  const deadline = Date.now() + 25_000; // never keep a reader waiting longer than this
  for (const { c, model, key } of order) {
    if (Date.now() > deadline) break;
    const call = c.provider === 'anthropic' ? anthropic : c.provider === 'sarvam' ? sarvam : gemini;
    try {
      const r = await call(c, model, text, target);
      if (!looksTranslated(text, target, r)) throw new BadOutput(`${model} did not translate into ${target}`);
      return r;
    } catch (err) {
      last = err;
      if (err instanceof BadOutput) {
        console.warn(`[translate] ${err.message}; trying the next model`);
        continue;
      }
      const skip = rest(key, err);
      console.warn(`[translate] ${err instanceof Error ? err.message.slice(0, 110) : err}${skip ? ' (resting this model)' : ''}`);
      if (!skip && !(err instanceof TypeError) && !c.backup) throw err; // a real error and nothing left to try: stop
    }
  }
  throw last instanceof Error ? last : new Error('translation failed');
}
