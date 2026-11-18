// Translation per reader. One interface, two engines:
//   - "llm"     (optional): our server's /api/translate (Gemini or Anthropic), on only
//               when the server has TRANSLATE_API_KEY. Handles Hinglish.
//   - "nexconn" (default):  Nexconn built-in translation, used only for the pairs that
//               passed our live test; other pairs show the original with a note.
// The sender's message is never changed: we only change what each reader sees.

import { nexconnTranslate } from '../../nexconn/translate';

export type Lang = 'en' | 'hi' | 'mr' | 'ta' | 'bn';
export type Engine = 'nexconn' | 'llm';

export const LANGUAGES: { code: Lang; english: string; native: string; speech: string }[] = [
  { code: 'en', english: 'English', native: 'English', speech: 'en-IN' },
  { code: 'hi', english: 'Hindi', native: 'हिन्दी', speech: 'hi-IN' },
  { code: 'mr', english: 'Marathi', native: 'मराठी', speech: 'mr-IN' },
  { code: 'ta', english: 'Tamil', native: 'தமிழ்', speech: 'ta-IN' },
  { code: 'bn', english: 'Bengali', native: 'বাংলা', speech: 'bn-IN' },
];
export const speechLang = (l: Lang) => LANGUAGES.find((x) => x.code === l)?.speech ?? 'en-IN';

const SOURCE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  hinglish: 'Hinglish',
  mr: 'Marathi',
  ta: 'Tamil',
  bn: 'Bengali',
};
export const sourceName = (code: string | null) => (code ? SOURCE_NAMES[code] ?? 'another language' : 'another language');

export interface Translation {
  translated: string;
  /** Detected source language (llm engine); null when unknown (nexconn engine). */
  sourceLang: string | null;
  engine: Engine;
}

// ---- script heuristics ---------------------------------------------------------------
type Script = 'latn' | 'deva' | 'taml' | 'beng' | 'other';
export function scriptOf(text: string): Script {
  const counts = { latn: 0, deva: 0, taml: 0, beng: 0 };
  for (const ch of text) {
    const c = ch.codePointAt(0)!;
    if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) counts.latn++;
    else if (c >= 0x0900 && c <= 0x097f) counts.deva++;
    else if (c >= 0x0b80 && c <= 0x0bff) counts.taml++;
    else if (c >= 0x0980 && c <= 0x09ff) counts.beng++;
  }
  const [best, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return n > 0 ? (best as Script) : 'other';
}
const TARGET_SCRIPT: Record<Lang, Script> = { en: 'latn', hi: 'deva', mr: 'deva', ta: 'taml', bn: 'beng' };

// Hindi typed in Latin letters. Nexconn's engine mistranslated it in our test,
// so with that engine we do not auto-translate it.
const HINGLISH = /\b(hai|hain|nahi|nahin|kya|kal|aaj|baje|jana|jaana|aana|aa|chalo|chalna|karo|karna|mera|meri|tera|tumhara|aap|aapka|beta|beti|ke|ki|ka|paas|subah|shaam|raat|abhi|bahut|accha|acha|theek|thik|ho|hoon|hun|gaya|gayi|raha|rahi)\b/gi;
export function looksHinglish(text: string): boolean {
  return scriptOf(text) === 'latn' && (text.match(HINGLISH)?.length ?? 0) >= 3;
}

export type Plan = 'skip' | 'translate' | 'unavailable';

// Does this text need translating for this reader, and can this engine do it?
export function planFor(text: string, target: Lang, engine: Engine): Plan {
  if (!text.trim() || !/\p{L}/u.test(text)) return 'skip'; // emoji / numbers only
  const script = scriptOf(text);
  if (engine === 'llm') {
    // Latin may be Hinglish and Devanagari may be Hindi or Marathi: let the server decide.
    if (script === TARGET_SCRIPT[target] && (target === 'ta' || target === 'bn')) return 'skip';
    return 'translate';
  }
  // nexconn: only pairs that passed the live test (English->Hindi, English->Marathi, Devanagari->English).
  if (script === TARGET_SCRIPT[target] && !(script === 'latn' && looksHinglish(text))) return 'skip';
  if (script === 'latn' && !looksHinglish(text) && (target === 'hi' || target === 'mr')) return 'translate';
  if (script === 'deva' && target === 'en') return 'translate';
  return 'unavailable';
}

// ---- engine choice -------------------------------------------------------------------------
let enginePromise: Promise<Engine> | null = null;
export function getEngine(): Promise<Engine> {
  enginePromise ??= fetch('/api/translate/config')
    .then((r) => (r.ok ? r.json() : { llm: false }))
    .then((c: { llm?: boolean }) => (c.llm ? 'llm' : 'nexconn') as Engine)
    .catch(() => 'nexconn' as Engine);
  return enginePromise;
}

// ---- cache (this device) -------------------------------------------------------------------
// The llm engine is also cached on the server (shared by everyone). The nexconn
// engine runs in each reader's browser, so it is cached on this device.
const memory = new Map<string, Translation>();
const cacheKey = (engine: Engine, messageId: string, lang: Lang) => `aangan.tr.${engine}.${lang}.${messageId}`;
function readCache(k: string): Translation | null {
  const hit = memory.get(k);
  if (hit) return hit;
  try {
    const raw = localStorage.getItem(k);
    if (raw) {
      const t = JSON.parse(raw) as Translation;
      memory.set(k, t);
      return t;
    }
  } catch {
    // storage blocked
  }
  return null;
}
function writeCache(k: string, t: Translation) {
  memory.set(k, t);
  try {
    localStorage.setItem(k, JSON.stringify(t));
  } catch {
    // storage full or blocked: memory cache still works
  }
}

// ---- the interface -------------------------------------------------------------------------
export async function translate(messageId: string, text: string, targetLang: Lang, authKey: string): Promise<Translation> {
  const engine = await getEngine();
  const k = cacheKey(engine, messageId, targetLang);
  const hit = readCache(k);
  if (hit) return hit;

  let result: Translation;
  if (engine === 'llm') {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authKey}` },
      body: JSON.stringify({ messageId, text, target: targetLang }),
    });
    const body = (await res.json().catch(() => ({}))) as { translated?: string; sourceLang?: string; error?: string };
    if (!res.ok || !body.translated) throw new Error(body.error ?? `Translation failed (HTTP ${res.status})`);
    result = { translated: body.translated, sourceLang: body.sourceLang ?? null, engine };
  } else {
    result = { translated: await nexconnTranslate(messageId, text, targetLang), sourceLang: null, engine };
  }
  writeCache(k, result);
  return result;
}

// "Asha says:" in the reader's language, for Listen.
const SAYS: Record<Lang, (name: string) => string> = {
  en: (n) => `${n} says:`,
  hi: (n) => `${n} का संदेश:`,
  mr: (n) => `${n} यांचा संदेश:`,
  ta: (n) => `${n} அனுப்பிய செய்தி:`,
  bn: (n) => `${n}-এর বার্তা:`,
};
export const saysPrefix = (lang: Lang, name: string) => SAYS[lang](name);
