# CLAUDE.md

Aangan is a family group chat for elders (60+): each reader picks font size, language and
reading mode, and every message arrives in that form. Built on Nexconn Chat. Product brief:
[IDEA.md](IDEA.md). Feature notes (translation, voice reply): [README.md](README.md).
Hackathon deadline: Nov 22, 2026.

## Commands

npm workspaces: `web` (React 19 + Vite 6 + Tailwind 4) and `server` (Express 5, run with tsx),
plus `ai/`, a Python 3.14 FastAPI service the server starts itself. Requires Node 20.6+
(`--env-file`) and Python 3.12+ (3.14 recommended). Run everything from the repo root.

```sh
npm install
npm run setup:ai     # once: ai/.venv with Python deps
npm run dev          # server :3001 (+ AI service :8001) + web :5173 (Vite proxies /api)
npm run typecheck    # server + web; the only automated check (no test runner, no linter)
npm run build        # server -> server/dist, web -> web/dist
npm run dev:test     # test room: server :3002 (TRANSLATE_MOCK=1, mock AI on :8002) + web :5174
npm run test:ai      # pytest for ai/ (mock provider, no network)
npm run smoke        # API smoke test against the dev:test server; refuses unless it is mocked
```

Run only one `npm run dev` at a time: two dev servers both re-seed the showcase room on every restart.

`dev:test` uses POSIX inline env vars, so it fails under npm's default `cmd.exe` on Windows.
Run it from Git Bash with `npm config set script-shell "C:\\Program Files\\Git\\bin\\bash.exe"`,
or set the variables by hand.

## Configuration

All config comes from the root `.env` (copy `.env.example`), loaded by
`node --env-file=../.env` in the server. The web app has no env file: it gets `appKey`,
`areaCode` and channel info from `/api/login`. Required: `NEXCONN_APP_KEY`,
`NEXCONN_APP_SECRET`, `NEXCONN_AREA_CODE` (SG|NA|SA, must match the Console),
`AANGAN_FAMILY_CHANNEL_ID`. AI is optional: `TRANSLATE_PROVIDER=sarvam|gemini|anthropic`.
With `sarvam`, `SARVAM_API_KEY` is used first and `TRANSLATE_API_KEY` (Gemini) is the automatic
backup (bad key, no credits, outage). Sarvam calls send `reasoning_effort: null` (fast) except the
summary, which uses `"low"` so it follows the prompt.

## Architecture

- **Server** ([server/src/index.ts](server/src/index.ts)): issues Nexconn tokens, creates and
  joins groups, invites, demo sessions, LLM translation. All routes under `/api`.
  - [nexconn.ts](server/src/nexconn.ts): signed Platform Chat API client
    (SHA1(secret+nonce+timestamp)), fails over to the backup domain. The App Secret never leaves the server.
  - [store.ts](server/src/store.ts): JSON file store in `server/data/` (git-ignored) for
    user authKeys and room invite codes. Writes are serialized.
  - Auth for our own APIs: `Authorization: Bearer <authKey>` (from `/api/login`). This is not a Nexconn credential.
  - [demo/](server/src/demo/): the "Sharma Family" showcase room with four personas, seeded once at startup.
  - [translate/](server/src/translate/): `engine.ts` (gemini | anthropic, with model fallbacks),
    `mock.ts` (fixed table used when `TRANSLATE_MOCK=1`). Cached per text hash + language.
  - [ai/sidecar.ts](server/src/ai/sidecar.ts): starts and supervises the Python service on
    127.0.0.1 (restarts with backoff, adopts a healthy one already on the port), calls it with
    `X-Internal-Token`. [routes/ai.ts](server/src/routes/ai.ts): `/api/shield/{scan,check,ask-family}`,
    `/api/ai/{summary,replies,status}`. "Ask my family" posts into a private two-person
    `safe…` group (random ID, stored in `store.json`).
  - In production the server also serves `web/dist` (SPA fallback). Deploy: `Dockerfile` +
    `render.yaml` (one Render service; config from env vars, no `.env` in the image).
- **AI service** ([ai/](ai/)): `rules.py` (weighted scam rules, en/hi/Hinglish/mr) runs first;
  the LLM (same `TRANSLATE_PROVIDER`/`TRANSLATE_API_KEY`) is only asked about flagged text.
  Every endpoint degrades to rules or fixed fallbacks, never a 500. `AI_MOCK=1` or
  `TRANSLATE_MOCK=1` uses a deterministic mock.
- **Web** ([web/src/App.tsx](web/src/App.tsx)): a small path router. `/` is the family app,
  `/join/:code` the invite page, `/showcase`, `/showcase/phone` and `/showcase/app` the demo pages.
  - `web/src/nexconn/` is **the only place that imports `@nexconn/chat` / `@nexconn/engine`**
    (pinned to 26.2.1). Components and hooks call these wrappers. Every function takes `channelId` explicitly.
  - [api.ts](web/src/api.ts): the only calls to our server. The browser never calls Nexconn REST.
  - [session.ts](web/src/session.ts): sessions in localStorage keyed by userId, with
    sessionStorage recording which user the tab is, so tabs can be different users.
  - Two reading modes: **Standard** (`components/workspace/`, three panes) and **Comfort**
    (`components/comfort/`, large type, rooms on the left and chat on the right).
  - `features/<name>/`: one folder per product feature. Built: `reader-view`, `voice-reply`,
    `scam-shield` (warnings sized to the reader, "Is this safe?", "Ask my family") and `assist`
    ("What did I miss?", quick replies). `check-in` and `judge-mode` are empty placeholders.
  - `web/public/welcome.html`: the 3D landing page (three.js from jsdelivr). First-time visitors
    to `/` are sent there; its buttons return to `/?start=1`.

## Rules

- Never post into the real family room from tests or scripts: use `npm run dev:test`, which
  sets `AANGAN_ROOM=test` (the server refuses if the test ID equals the family ID).
- Never call the real translation API in tests (`TRANSLATE_MOCK=1`). The Gemini free tier has a small daily quota.
  `/api/translate/config` returns `mock:true` so scripts can check.
- Nexconn IDs (users, channels): letters and digits only, at most 64 characters.
- Check Nexconn SDK API names against `node_modules/@nexconn/chat/index.d.ts`, not memory.
  For Nexconn questions use the `nexconn-chat` skill in `.claude/skills/`.
- The `nexconn` translation engine translates only en→hi, en→mr and Devanagari→en
  (see the README test table). Do not widen this without testing live.
- UI is for elders: large tap targets, plain words, and show the original whenever a
  translation is shown or unavailable.
- Showcase room: seeding only happens for a group the server just created, so a fresh disk
  never re-posts it. To change the demo script, bump the default `aangandemoN` in `config.ts`.
- Group messages sent by the server use `isEchoToSender: 1`, or the sender never sees them.
- Keep `.env` and `server/data/` out of git. Commits carry no Claude attribution
  (`.claude/settings.json`).
