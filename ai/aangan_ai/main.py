"""FastAPI app. Run from ai/:  python -m uvicorn aangan_ai.main:app --host 127.0.0.1 --port 8001"""

from __future__ import annotations

import hmac
import logging
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from starlette.exceptions import HTTPException as StarletteHTTPException

from .cache import TTLCache
from .config import Settings, load_settings
from .llm import LLM
from .replies import Replies
from .shield import Shield
from .summary import Summary

log = logging.getLogger("aangan_ai")

Lang = Literal["en", "hi", "mr", "ta", "bn"]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]


class _In(BaseModel):
    model_config = ConfigDict(extra="ignore")


class ScanIn(_In):
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]
    lang: Lang
    deep: bool = True


class SummaryMessage(_In):
    sender: Name
    text: Annotated[str, StringConstraints(max_length=2000)]
    at: int | None = None


class SummaryIn(_In):
    lang: Lang
    reader: Annotated[str, StringConstraints(strip_whitespace=True, max_length=40)] | None = None
    messages: list[SummaryMessage] = Field(min_length=1, max_length=60)


class RepliesIn(_In):
    lang: Lang
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
    sender: Annotated[str, StringConstraints(strip_whitespace=True, max_length=40)] | None = None


def _validation_message(exc: RequestValidationError) -> str:
    errors = exc.errors()
    if not errors:
        return "invalid request"
    e = errors[0]
    loc = ".".join(str(p) for p in e.get("loc", ()) if p != "body")
    msg = str(e.get("msg", "invalid value"))
    return f"{loc}: {msg}" if loc else msg


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or load_settings()
    llm = LLM(settings)
    shield = Shield(llm, TTLCache(maxsize=2000))
    summary = Summary(llm, TTLCache(maxsize=500, ttl=3600))
    replies = Replies(llm, TTLCache(maxsize=1000))

    app = FastAPI(title="Aangan AI", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.settings = settings
    app.state.llm = llm

    async def require_token(x_internal_token: Annotated[str | None, Header()] = None) -> None:
        expected = settings.internal_token
        if not expected:
            return
        given = (x_internal_token or "").encode("utf-8")
        if not hmac.compare_digest(given, expected.encode("utf-8")):
            raise HTTPException(status_code=401, detail="unauthorized")

    @app.exception_handler(RequestValidationError)
    async def on_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"error": _validation_message(exc)})

    @app.exception_handler(StarletteHTTPException)
    async def on_http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "error"
        return JSONResponse(status_code=exc.status_code, content={"error": detail}, headers=exc.headers)

    @app.exception_handler(Exception)
    async def on_error(_: Request, exc: Exception) -> JSONResponse:
        log.error("unhandled error: %s", type(exc).__name__)
        return JSONResponse(status_code=500, content={"error": "internal error"})

    @app.get("/health")
    async def health() -> dict:
        return {"ok": True, "llm": settings.llm_name, "model": settings.model if settings.provider else None}

    @app.post("/shield/scan", dependencies=[Depends(require_token)])
    async def shield_scan(body: ScanIn) -> dict:
        return await shield.scan(body.text, body.lang, body.deep)

    @app.post("/summary", dependencies=[Depends(require_token)])
    async def summary_route(body: SummaryIn) -> dict:
        messages = [m.model_dump() for m in body.messages]
        return await summary.summarize(body.lang, body.reader or None, messages)

    @app.post("/replies", dependencies=[Depends(require_token)])
    async def replies_route(body: RepliesIn) -> dict:
        return await replies.suggest(body.lang, body.text, body.sender or None)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    s: Settings = app.state.settings
    uvicorn.run(app, host="127.0.0.1", port=s.port)
