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

### Tests never use the real translation engine

`npm run dev:test` starts the server with `TRANSLATE_MOCK=1`: translations come from a fixed
table in `server/src/translate/mock.ts`, are cached separately (`translations.mock.json`), and
no request leaves the machine. This keeps the Gemini free-tier quota for real use.
`/api/translate/config` reports `{"llm":true,"mock":true}` so test scripts can refuse to run
against a real engine.

## Notes: voice reply

Tap **Speak** (Comfort) or the microphone (Standard), talk, see the words appear live, then
**Send** or **Redo**. Speech-to-text uses the browser's `SpeechRecognition` in the speaker's
chosen language (`hi-IN`, `en-IN`, …); where the browser lacks it, the button is hidden and a
short reason is shown.

What is sent is a real Nexconn voice message (`RC:HQVCMsg`, up to 60 s, recorded with
`MediaRecorder`) with the transcript in the message's `extra` field. Readers see a player,
the duration and the words, and the words are translated and read aloud like any text. If the
microphone audio cannot be recorded but speech-to-text worked, the transcript is sent as a
text message marked "Spoken" instead, and the person is told before sending.

## Notes: scam shield and AI helpers

The AI features live in a Python 3.14 service (`ai/`, FastAPI) that the Node server starts and
supervises. The browser only talks to our server.

- **Rules first, AI second.** Every message is scored by weighted rules (English, Hindi,
  Hinglish, Marathi: fake police/"digital arrest", KYC, OTP, prize, family emergency,
  investment, job, parcel, electricity bill, links, payment requests). Only messages the rules
  flag go to the LLM, which explains the risk in the reader's language. If the LLM is down or
  out of quota, the rules' verdict and fixed advice are shown. The shield never stops working.
- **Sized to the reader.** Comfort readers get a large card with what to do, Listen, and
  "Ask my family". Standard readers get a one-line note they can expand. The original message
  always stays visible.
- **Is this safe?** Paste a message from SMS, WhatsApp or a call and get the same verdict.
- **Ask my family.** Sends the message and verdict to a trusted member in a private two-person
  room (created on first use).
- **What did I miss?** A short summary of what others said since the reader last looked, read
  aloud in their language. Scam-looking messages are called out in the summary.
- **Quick replies.** Three short replies to the latest message, in the reader's language. They
  fill the message box; the reader still presses Send. No suggestions for scam-looking text.

**Models.** Sarvam (`sarvam-105b`) is the main model for translation, the shield, summaries and
replies (`TRANSLATE_PROVIDER=sarvam`, `SARVAM_API_KEY`). Gemini (`TRANSLATE_API_KEY`) takes over
automatically if Sarvam fails or runs out of credits. Check credits at dashboard.sarvam.ai >
Settings > Billing.

Setup: `npm run setup:ai` once, then `npm run dev`. Tests: `npm run test:ai` (pytest, mock) and
`npm run smoke` (against `npm run dev:test`).

## Deploy (Render)

`render.yaml` + `Dockerfile` build one service with Node 22 and Python 3.14. In Render, choose
New > Blueprint, pick the repo, and fill in the secret env vars (`NEXCONN_APP_KEY`,
`NEXCONN_APP_SECRET`, `AANGAN_FAMILY_CHANNEL_ID`, `TRANSLATE_API_KEY`, ...). Health check:
`/api/health`. The free plan's disk is wiped on each deploy, so people sign in again after a
deploy; the showcase room is not re-posted.
