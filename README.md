# Aangan

## Notes: translation per reader

Each reader chooses a language in **How I read** (English, Hindi, Marathi, Tamil, Bengali).
Other people's messages are shown in that language; the sender's message is never changed.
Translation runs per reader, on arrival and for history. **Listen** reads the translation in
the reader's language.

Two engines sit behind one interface, `translate(messageId, text, targetLang)` →
`{ translated, sourceLang, engine }` (`web/src/features/reader-view/translation.ts`):

| Engine | When it is used | What the reader sees |
| --- | --- | --- |
| `nexconn` (default) | No `TRANSLATE_API_KEY` on the server | Only the pairs that passed our test are translated. The original is always shown under the translation, labelled "Original", with "Machine translated · may have mistakes". Other pairs show the original and "Translation not available yet". Cached on the reader's device. |
| `llm` (optional) | Server has `TRANSLATE_API_KEY` (`TRANSLATE_PROVIDER=gemini` or `anthropic`) | "Translated from Hindi · Show original" (original one tap away). Runs on the server (`/api/translate`), cached in `server/data` per message text and language, rate limited. The key never leaves the server. |

### Live test of Nexconn built-in translation (2026-11-18)

Run through the Web SDK (`translateTexts`, source `auto`) after enabling Translation in the
Nexconn Console. Before enabling it, every call returned code 28400 (`TRANS_SERVICE_NOT_OPEN`).

| Input → target | Nexconn output | Verdict |
| --- | --- | --- |
| "kal subah 9 baje aa jana, doctor ke paas chalna hai" → English | "Kal Subah 9 baje AA Jana, doctor to PaaS Chalna Hai" | Fail: not translated |
| same Hinglish → Hindi | "यदि आप 9 बजे उठते हैं, तो आपको डॉक्टर के पास जाना होगा" ("If you wake up at 9…") | Fail: wrong meaning |
| "I am leaving now, see you at lunch." → Hindi | "मैं अभी जा रहा हूँ, दोपहर के भोजन में देख रहा हूँ।" | Partly: awkward |
| same → Marathi | "मी आता निघतोय, जेवताना तुला भेटतो." | Pass |
| same → Bengali | "ইয়ামলেইসিভিংও, কুমিনিয়াটলাচ।" | Fail: transliterated nonsense |
| same → Tamil | error 28401 (`TRANS_FAILED`) | Fail |
| "मैं आलू के पराठे बनाऊँगी।" → English | "i will make the parathi of potatoes." | Partly: rough |

With the `nexconn` engine we therefore translate only English → Hindi, English → Marathi and
Devanagari → English, and we do not auto-translate Hinglish (detected with a simple word
heuristic), Tamil or Bengali.

### Why the second engine exists

Hinglish is how many Indian families actually type, and a mistranslated time or instruction
("if you wake up at 9" instead of "come tomorrow at 9") is worse than no translation for an
elder. With Gemini (same test, structured JSON output):

| Input → target | Output |
| --- | --- |
| Hinglish → English | "Come tomorrow morning at 9 o'clock, we have to go to the doctor" (source detected: hinglish) |
| Hinglish → Hindi | "कल सुबह 9 बजे आ जाना, डॉक्टर के पास चलना है" |

Observed limits on the Gemini free tier: a small **daily quota per model** (429
`GenerateRequestsPerDayPerProjectPerModel-FreeTier`) and occasional 503 "high demand". The
engine therefore tries `TRANSLATE_MODEL` (default `gemini-3.8-flash`) and then the fallbacks
(`gemini-flash-lite-latest`, `gemini-3.5-flash-lite`), rests a failing model for a while,
gives up after 25 s (the reader then sees the original with "Translation not available yet"),
and rejects answers that come back untranslated or in the wrong script instead of caching them.
