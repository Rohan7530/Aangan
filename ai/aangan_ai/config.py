"""Settings read from the environment (Node passes the root .env through).

Never log the API key: only the provider name and model are ever exposed.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Literal

Provider = Literal["gemini", "anthropic", "sarvam", "mock"]

DEFAULT_MODEL = {"gemini": "gemini-3.8-flash", "anthropic": "claude-haiku-5-5", "sarvam": "sarvam-105b"}
DEFAULT_FALLBACKS = {"gemini": "gemini-flash-lite-latest,gemini-3.5-flash-lite", "anthropic": "", "sarvam": ""}


@dataclass(frozen=True)
class Settings:
    provider: Provider | None  # None -> LLM off (rules and fallbacks only)
    api_key: str = field(default="", repr=False)
    model: str | None = None
    fallbacks: tuple[str, ...] = ()
    internal_token: str = field(default="", repr=False)
    port: int = 8001
    # Tried after the main provider's models fail, e.g. Sarvam first, then Gemini.
    backup: "Settings | None" = None

    @property
    def llm_name(self) -> str:
        return self.provider or "off"


def _env(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def load_settings() -> Settings:
    token = _env("AI_INTERNAL_TOKEN")
    try:
        port = int(_env("AI_PORT") or "8001")
    except ValueError:
        port = 8001

    if _env("AI_MOCK") == "1" or _env("TRANSLATE_MOCK") == "1":
        return Settings(provider="mock", model="mock", internal_token=token, port=port)

    name = _env("TRANSLATE_PROVIDER").lower()
    provider: Provider = name if name in ("anthropic", "sarvam") else "gemini"  # type: ignore[assignment]
    translate_key = _env("TRANSLATE_API_KEY")
    # Sarvam has its own key; TRANSLATE_API_KEY then serves the backup provider.
    api_key = (_env("SARVAM_API_KEY") or translate_key) if provider == "sarvam" else translate_key
    if not api_key:
        return Settings(provider=None, internal_token=token, port=port)

    backup = None
    if provider == "sarvam" and translate_key and translate_key != api_key:
        bname = _env("BACKUP_PROVIDER").lower() or "gemini"
        bprov: Provider = "anthropic" if bname == "anthropic" else "gemini"
        bmodel = DEFAULT_MODEL[bprov]
        braw = DEFAULT_FALLBACKS[bprov]
        backup = Settings(
            provider=bprov,
            api_key=translate_key,
            model=bmodel,
            fallbacks=tuple(m for m in braw.split(",") if m and m != bmodel),
        )

    model = _env("AI_MODEL") or DEFAULT_MODEL[provider]
    raw = os.environ.get("AI_FALLBACK_MODELS")
    if raw is None:
        raw = os.environ.get("TRANSLATE_FALLBACK_MODELS")
    if raw is None:
        raw = DEFAULT_FALLBACKS[provider]
    fallbacks = tuple(dict.fromkeys(m.strip() for m in raw.split(",") if m.strip() and m.strip() != model))
    return Settings(
        provider=provider,
        api_key=api_key,
        model=model,
        fallbacks=fallbacks,
        internal_token=token,
        port=port,
        backup=backup,
    )
