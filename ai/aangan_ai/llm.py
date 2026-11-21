"""LLM provider client (sarvam | gemini | anthropic), mirroring server/src/translate/engine.ts.

`LLM.json()` returns a validated dict, or None on any failure: callers then use
their rule/fallback answer. It never raises. The API key goes only into request
headers and is never logged.

Models that fail are "resting" for a while, so callers don't wait on them:
  429 with a daily quota (PerDay) -> 1 hour; other 429 / 5xx / timeout -> 2 min;
  404 (model removed) -> until restart.
"""

from __future__ import annotations

import json
import logging
import math
import time
from collections.abc import Callable
from typing import Any
from urllib.parse import quote

import httpx

from .config import Settings

log = logging.getLogger("aangan_ai.llm")

CALL_TIMEOUT = 12.0  # seconds per HTTP call
BUDGET = 25.0  # seconds for the whole request, across fallbacks
THINKING_TIMEOUT = 18.0  # per call when Sarvam reasoning is on (summary)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
SARVAM_URL = "https://api.sarvam.ai/v1/chat/completions"
REAL_PROVIDERS = ("gemini", "anthropic", "sarvam")


class ProviderError(Exception):
    def __init__(self, status: int, message: str, per_day: bool = False) -> None:
        super().__init__(message)
        self.status = status
        self.per_day = per_day


class BadOutput(Exception):
    pass


def _rest_seconds(err: Exception) -> float:
    if isinstance(err, ProviderError):
        if err.status == 404:
            return math.inf
        if err.status in (401, 402, 403):  # bad key or credits used up: let the backup take over
            return 3600.0
        if err.status == 429:
            return 3600.0 if err.per_day else 120.0
        if err.status >= 500:
            return 120.0
        return 0.0
    if isinstance(err, httpx.TimeoutException):
        return 120.0
    return 0.0


def _gemini_schema(schema: dict[str, Any]) -> dict[str, Any]:
    """Convert a small JSON schema (object/string/array/enum) to Gemini's format."""
    t = schema.get("type", "string")
    out: dict[str, Any] = {"type": t.upper()}
    if "enum" in schema:
        out["enum"] = schema["enum"]
    if t == "object":
        out["properties"] = {k: _gemini_schema(v) for k, v in schema.get("properties", {}).items()}
        if "required" in schema:
            out["required"] = schema["required"]
    if t == "array":
        out["items"] = _gemini_schema(schema.get("items", {"type": "string"}))
    return out


class LLM:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._resting: dict[str, float] = {}  # model -> monotonic time it may be used again

    @property
    def available(self) -> bool:
        """A real provider is configured (mock is handled by the callers)."""
        return self.settings.provider in REAL_PROVIDERS and bool(self.settings.api_key)

    def _chain(self) -> list[tuple[str, str, str]]:
        """(provider, model, key) in the order to try: main provider, then its backup."""
        out: list[tuple[str, str, str]] = []
        s: Settings | None = self.settings
        while s is not None:
            if s.provider in REAL_PROVIDERS and s.api_key:
                out += [(s.provider, m, s.api_key) for m in (s.model, *s.fallbacks) if m]
            s = s.backup
        return out

    @property
    def is_mock(self) -> bool:
        return self.settings.provider == "mock"

    async def json(
        self,
        system: str,
        user: str,
        schema: dict[str, Any],
        *,
        temperature: float = 0.0,
        validate: Callable[[dict[str, Any]], Any] | None = None,
        max_tokens: int = 1024,
        reasoning: str | None = None,
    ) -> Any | None:
        """reasoning: Sarvam reasoning_effort ("low" | "medium" | "high"); None = off (fastest)."""
        if not self.available:
            return None
        chain = self._chain()
        now = time.monotonic()
        ready = [c for c in chain if self._resting.get(f"{c[0]}:{c[1]}", 0.0) <= now]
        order = ready or chain  # everything resting: try anyway
        deadline = now + BUDGET
        try:
            async with httpx.AsyncClient() as client:
                for provider, model, key in order:
                    remaining = deadline - time.monotonic()
                    if remaining < 1.0:
                        break
                    per_call = THINKING_TIMEOUT if reasoning and provider == "sarvam" else CALL_TIMEOUT
                    timeout = min(per_call, remaining)
                    try:
                        if provider == "anthropic":
                            data = await self._anthropic(client, model, key, system, user, schema, temperature, max_tokens, timeout)
                        elif provider == "sarvam":
                            data = await self._sarvam(
                                client, model, key, system, user, schema, temperature, max_tokens, timeout, reasoning
                            )
                        else:
                            data = await self._gemini(client, model, key, system, user, schema, temperature, max_tokens, timeout)
                        if validate is None:
                            return data
                        try:
                            return validate(data)
                        except (ValueError, TypeError, KeyError) as e:
                            raise BadOutput(f"{model}: bad output ({e})") from e
                    except Exception as e:  # noqa: BLE001 - any failure -> next model
                        secs = _rest_seconds(e)
                        if secs:
                            self._resting[f"{provider}:{model}"] = time.monotonic() + secs
                        log.warning(
                            "[ai] %s %s failed: %s%s",
                            provider,
                            model,
                            (str(e) or type(e).__name__)[:140],
                            " (resting this model)" if secs else "",
                        )
        except Exception as e:  # noqa: BLE001 - e.g. client setup failure
            log.warning("[ai] %s client error: %s", self.settings.provider, type(e).__name__)
        return None

    async def _gemini(
        self,
        client: httpx.AsyncClient,
        model: str,
        key: str,
        system: str,
        user: str,
        schema: dict[str, Any],
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> dict[str, Any]:
        res = await client.post(
            GEMINI_URL.format(model=quote(model, safe="")),
            headers={"Content-Type": "application/json", "x-goog-api-key": key},
            timeout=timeout,
            json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": user}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                    "responseMimeType": "application/json",
                    "responseSchema": _gemini_schema(schema),
                },
            },
        )
        body = _safe_json(res)
        if res.status_code >= 400:
            msg = str((body.get("error") or {}).get("message", "error"))[:120] if isinstance(body, dict) else "error"
            raise ProviderError(res.status_code, f"gemini {res.status_code}: {msg}", "PerDay" in res.text)
        try:
            text = body["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as e:
            raise BadOutput("gemini: no output") from e
        return _parse_object(text)

    async def _anthropic(
        self,
        client: httpx.AsyncClient,
        model: str,
        key: str,
        system: str,
        user: str,
        schema: dict[str, Any],
        temperature: float,
        max_tokens: int,
        timeout: float,
    ) -> dict[str, Any]:
        res = await client.post(
            ANTHROPIC_URL,
            headers={
                "Content-Type": "application/json",
                "x-api-key": key,
                "anthropic-version": "2023-06-01",
            },
            timeout=timeout,
            json={
                "model": model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "system": f"{system}\nReply with JSON only, matching this JSON schema: {json.dumps(schema, ensure_ascii=False)}",
                "messages": [{"role": "user", "content": user}],
            },
        )
        body = _safe_json(res)
        if res.status_code >= 400:
            msg = str((body.get("error") or {}).get("message", "error"))[:120] if isinstance(body, dict) else "error"
            raise ProviderError(res.status_code, f"anthropic {res.status_code}: {msg}", "PerDay" in res.text)
        parts = body.get("content") if isinstance(body, dict) else None
        text = next((p.get("text", "") for p in parts or [] if isinstance(p, dict) and p.get("type") == "text"), "")
        text = text.strip()
        return _parse_object(text[text.find("{") : text.rfind("}") + 1])


    async def _sarvam(
        self,
        client: httpx.AsyncClient,
        model: str,
        key: str,
        system: str,
        user: str,
        schema: dict[str, Any],
        temperature: float,
        max_tokens: int,
        timeout: float,
        reasoning: str | None = None,
    ) -> dict[str, Any]:
        """Sarvam chat completions (OpenAI-style). reasoning_effort=null turns off the
        model's thinking: about 1 s instead of 3-5 s and ~10x fewer tokens, with the
        same answers for these short tasks (tested on Hindi and Hinglish)."""
        res = await client.post(
            SARVAM_URL,
            headers={"Content-Type": "application/json", "api-subscription-key": key},
            timeout=timeout,
            json={
                "model": model,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "reasoning_effort": reasoning,
                "messages": [
                    {
                        "role": "system",
                        "content": f"{system}\nReply with JSON only, matching this JSON schema: {json.dumps(schema, ensure_ascii=False)}",
                    },
                    {"role": "user", "content": user},
                ],
            },
        )
        body = _safe_json(res)
        if res.status_code >= 400:
            err = body.get("error") if isinstance(body, dict) else None
            msg = str(err.get("message", "error") if isinstance(err, dict) else err or "error")[:120]
            # 402: credits used up -> rest like a daily quota, so the backup takes over.
            raise ProviderError(res.status_code, f"sarvam {res.status_code}: {msg}", res.status_code == 402)
        try:
            text = body["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as e:
            raise BadOutput("sarvam: no output") from e
        if "</think>" in text:
            text = text.split("</think>")[-1]
        text = text.strip()
        return _parse_object(text[text.find("{") : text.rfind("}") + 1])


def _safe_json(res: httpx.Response) -> Any:
    try:
        return res.json()
    except ValueError:
        return {}


def _parse_object(text: str) -> dict[str, Any]:
    try:
        value = json.loads(text)
    except ValueError as e:
        raise BadOutput("reply was not JSON") from e
    if not isinstance(value, dict):
        raise BadOutput("reply was not a JSON object")
    return value
