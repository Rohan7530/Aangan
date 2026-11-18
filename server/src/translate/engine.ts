// The "llm" translation engine (server side only). The API key is read from
// .env here and never sent to the browser: routes return only results.
// Provider is swappable with TRANSLATE_PROVIDER=gemini | anthropic.

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
  provider: 'gemini' | 'anthropic';
  apiKey: string;
  model: string;
  /** Tried in order when the main model is overloaded (503/429) or times out. */
  fallbacks: string[];
}

export function loadTranslateConfig(): TranslateConfig | null {
  const apiKey = process.env.TRANSLATE_API_KEY?.trim();
  if (!apiKey) return null; // engine simply off
  const provider = process.env.TRANSLATE_PROVIDER?.trim().toLowerCase() === 'anthropic' ? 'anthropic' : 'gemini';
  const model =
    process.env.TRANSLATE_MODEL?.trim() || (provider === 'gemini' ? 'gemini-3.8-flash' : 'claude-haiku-5-5');
  const fallbacks = (process.env.TRANSLATE_FALLBACK_MODELS ?? (provider === 'gemini' ? 'gemini-flash-lite-latest,gemini-3.5-flash-lite' : ''))
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m && m !== model);
  return { provider, apiKey, model, fallbacks };
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

// Main model first, then the fallbacks, skipping models that are resting.
export async function llmTranslate(cfg: TranslateConfig, text: string, target: Lang): Promise<LlmResult> {
  const call = cfg.provider === 'anthropic' ? anthropic : gemini;
  const all = [cfg.model, ...cfg.fallbacks];
  const ready = all.filter((m) => (resting.get(m) ?? 0) <= Date.now());
  const order = ready.length ? ready : all; // everything resting: try anyway
  let last: unknown;
  const deadline = Date.now() + 25_000; // never keep a reader waiting longer than this
  for (const model of order) {
    if (Date.now() > deadline) break;
    try {
      const r = await call(cfg, model, text, target);
      if (!looksTranslated(text, target, r)) throw new BadOutput(`${model} did not translate into ${target}`);
      return r;
    } catch (err) {
      last = err;
      if (err instanceof BadOutput) {
        console.warn(`[translate] ${err.message}; trying the next model`);
        continue;
      }
      const skip = rest(model, err);
      console.warn(`[translate] ${err instanceof Error ? err.message.slice(0, 110) : err}${skip ? ' (resting this model)' : ''}`);
      if (!skip && !(err instanceof TypeError)) throw err; // a real error (bad output etc.): stop
    }
  }
  throw last instanceof Error ? last : new Error('translation failed');
}
