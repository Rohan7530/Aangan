// Test-only translation engine (TRANSLATE_MOCK=1, set by `npm run dev:test`).
// Never calls the network, so automated tests do not use the real Gemini quota.
import type { Lang, LlmResult, SourceLang } from './engine.js';

// Known test sentences -> fixed translations. A trailing run tag like "(ab12)" is kept.
const KNOWN: Record<string, Partial<Record<Lang, string>> & { source: SourceLang }> = {
  'kal subah 9 baje aa jana, doctor ke paas chalna hai': {
    source: 'hinglish',
    en: "Come tomorrow morning at 9 o'clock, we have to go to the doctor",
    hi: 'कल सुबह 9 बजे आ जाना, डॉक्टर के पास चलना है',
  },
  'I am leaving now, see you at lunch.': { source: 'en', hi: 'मैं अभी निकल रहा हूँ, लंच पर मिलते हैं।', mr: 'मी आता निघतोय, जेवताना भेटू.' },
  'मैं कल सुबह तैयार रहूँगी।': { source: 'hi', en: 'I will be ready tomorrow morning.' },
  'Dadi, I will pick you up at 12:30 for lunch.': { source: 'en', hi: 'दादी, मैं आपको 12:30 बजे लंच के लिए लेने आऊँगा।' },
};

const GENERIC: Record<Lang, string> = {
  en: 'Translated message',
  hi: 'अनुवादित संदेश',
  mr: 'अनुवादित संदेश',
  ta: 'மொழிபெயர்க்கப்பட்ட செய்தி',
  bn: 'অনুবাদিত বার্তা',
};

function guessSource(text: string): SourceLang {
  if (/[ऀ-ॿ]/.test(text)) return 'hi';
  if (/[஀-௿]/.test(text)) return 'ta';
  if (/[ঀ-৿]/.test(text)) return 'bn';
  return /\b(hai|kal|baje|jana|nahi|kya|aaj)\b/i.test(text) ? 'hinglish' : 'en';
}

export async function mockTranslate(text: string, target: Lang): Promise<LlmResult> {
  const m = text.match(/^(.*?)(\s*\([a-z0-9]{3,6}\))?$/s);
  const core = (m?.[1] ?? text).trim();
  const tag = m?.[2] ?? '';
  const known = KNOWN[core];
  const sourceLang = known?.source ?? guessSource(core);
  if (sourceLang === target) return { translated: text, sourceLang };
  const out = known?.[target] ?? `${GENERIC[target]}: ${core.replace(/[A-Za-z]/g, '').trim() || '…'}`;
  await new Promise((r) => setTimeout(r, 150)); // a little realism
  return { translated: `${out}${tag}`, sourceLang };
}
