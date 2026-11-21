# Aangan AI sidecar

A small FastAPI service (Python 3.14) that the Node server (`server/`) starts as a child
process and proxies to. It holds three features:

- **Scam shield**: regex rules (English, Hindi, Hinglish, Marathi) plus an optional LLM opinion.
- **Catch-up summary**: unread family messages as 1 to 5 short lines and a spoken version.
- **Quick replies**: 3 short, warm replies in the reader's language.

When the LLM is off or fails, every endpoint still answers from rules and fixed fallbacks. It never returns a 500 for an LLM failure.

## Run

```sh
py -3.14 -m venv ai/.venv
ai/.venv/Scripts/python -m pip install -r ai/requirements-dev.txt
ai/.venv/Scripts/python -m pytest ai/tests -q      # tests use AI_MOCK=1, no network

# from ai/ (this is the command Node uses):
.venv/Scripts/python -m uvicorn aangan_ai.main:app --host 127.0.0.1 --port 8001
# or: python -m aangan_ai.main   (port from AI_PORT, default 8001)
```

## Environment

All variables are read from the environment; Node passes the root `.env` through.

| Variable | Meaning |
|---|---|
| `TRANSLATE_PROVIDER` | `gemini` (default) or `anthropic` |
| `TRANSLATE_API_KEY` | Empty means the LLM is off (rules and fallbacks only) |
| `AI_MODEL` | Default `gemini-3.8-flash` or `claude-haiku-5-5` |
| `AI_FALLBACK_MODELS` | Comma list. Falls back to `TRANSLATE_FALLBACK_MODELS`, then to the gemini defaults |
| `AI_MOCK=1` / `TRANSLATE_MOCK=1` | Deterministic mock provider, no network |
| `AI_INTERNAL_TOKEN` | If set, every endpoint except `GET /health` needs header `X-Internal-Token` |
| `AI_PORT` | Port for `python -m aangan_ai.main` (default 8001) |

When a model is overloaded or times out, it rests for 2 minutes. When the daily quota is used up, it rests for 1 hour. A model that returns 404 rests until restart. Fallback models are tried in order. Each call has a 12 s limit, and the whole request has 20 s.

## Endpoints

All take and return JSON. A validation error returns 422 `{"error": "..."}`, and an unknown error returns 500 `{"error": "internal error"}`.
`lang` is one of `en`, `hi`, `mr`, `ta`, `bn`.

- `GET /health` -> `{"ok": true, "llm": "gemini"|"anthropic"|"mock"|"off", "model": str|null}`
- `POST /shield/scan` `{"text", "lang", "deep": true}` ->
  `{"level": "safe"|"caution"|"danger", "score", "category", "signals", "title", "advice", "explanation", "engine": "rules"|"ai", "cached"}`.
  `signals` are short reasons in the reader's language. `category` is one of `digital_arrest`, `kyc_bank`, `otp`,
  `lottery_prize`, `family_emergency`, `investment`, `job`, `parcel_customs`, `utility_bill`,
  `link_phishing`, `payment_request`, or null.
  How the level is chosen:
  - A rule score below 25 is safe, and the LLM is not called.
  - The LLM gives its opinion, but a rule score of 80 or more always stays `danger`, and a rule score of 50 or more is never lowered below `caution`.
  - Without the LLM, a rule score of 60 or more is `danger`; anything lower is `caution`.
- `POST /summary` `{"lang", "reader": str|null, "messages": [{"sender", "text", "at": int|null}]}` (1 to 60 messages) ->
  `{"lines": [str], "spoken": str, "engine": "ai"|"fallback", "cached"}`
- `POST /replies` `{"lang", "text", "sender": str|null}` -> `{"replies": [3 strings, at most 40 chars each], "engine": "ai"|"fallback"}`.
  When the text looks like a scam (rule score 50 or more), it returns a safe set such as "Who is this?".

## Files

`aangan_ai/rules.py` holds the scam rules. `texts.py` holds all the strings people see.
`llm.py` is the provider client. `cache.py` is a TTL LRU cache that also merges identical requests arriving at the same time.
`shield.py`, `summary.py` and `replies.py` hold the features, and `main.py` holds the routes.
