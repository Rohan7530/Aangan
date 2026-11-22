"""Provider configured, but HTTP is faked: failures must degrade, never 500."""

import asyncio
import json
import time

import httpx
import pytest
from fastapi.testclient import TestClient

from aangan_ai.cache import TTLCache
from aangan_ai.config import load_settings
from aangan_ai.main import create_app
from aangan_ai.shield import Shield

SCAM = "Dadi it's me Kabir, I lost my phone, this is my new number. I had an accident, please send ₹15,000 urgently on GPay. Don't tell papa."
OTP = "Please share the OTP you received just now."  # rule score 45
KYC = "aapka khata band ho jayega, KYC update karein"  # rule score 60
MESSAGES = [{"sender": "Arjun", "text": "Lunch at 12:30 on Sunday?"}, {"sender": "Papa", "text": "Yes, I will come."}]


def fake_send(monkeypatch, handler):
    """Replace httpx.AsyncClient.send; handler(request) -> httpx.Response. Returns the request log."""
    seen: list[httpx.Request] = []

    async def send(self, request, *args, **kwargs):
        seen.append(request)
        res = handler(request)
        res.request = request
        return res

    monkeypatch.setattr(httpx.AsyncClient, "send", send)
    return seen


def gemini_reply(obj):
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": json.dumps(obj, ensure_ascii=False)}]}}]})


def anthropic_reply(text):
    return httpx.Response(200, json={"content": [{"type": "text", "text": text}]})


# ---- network down -------------------------------------------------------------


def test_network_failure_degrades(make_client, network_calls):
    client = make_client(TRANSLATE_API_KEY="fake-key")

    shield = client.post("/shield/scan", json={"text": SCAM, "lang": "hi"})
    assert shield.status_code == 200
    body = shield.json()
    assert body["engine"] == "rules" and body["level"] == "danger" and body["explanation"] is None
    assert body["title"] == "यह धोखा हो सकता है"
    assert len(network_calls) == 3  # main model + 2 default fallbacks
    assert all("generativelanguage.googleapis.com" in u for u in network_calls)

    caution = client.post("/shield/scan", json={"text": OTP, "lang": "en"}).json()
    assert caution["engine"] == "rules" and caution["level"] == "caution"

    summary = client.post("/summary", json={"lang": "hi", "reader": "दादी", "messages": MESSAGES})
    assert summary.status_code == 200
    s = summary.json()
    assert s["engine"] == "fallback"
    assert s["lines"][0] == "2 नए संदेश: Papa, Arjun से।"
    assert s["lines"][1] == 'Papa का आख़िरी संदेश: "Yes, I will come."'
    assert s["spoken"].startswith("नमस्ते दादी।")

    replies = client.post("/replies", json={"lang": "en", "text": "Lunch at 12:30?"})
    assert replies.status_code == 200
    assert replies.json() == {"replies": ["👍 Okay", "Thank you! 🙏", "Please call me 📞"], "engine": "fallback"}


def test_safe_text_never_calls_llm(make_client, network_calls):
    client = make_client(TRANSLATE_API_KEY="fake-key")
    body = client.post("/shield/scan", json={"text": "Happy birthday Papa! 🎂", "lang": "en"}).json()
    assert body["level"] == "safe" and body["engine"] == "rules"
    assert network_calls == []


def test_llm_off_uses_rules(make_client, network_calls):
    client = make_client()
    assert client.post("/shield/scan", json={"text": KYC, "lang": "en"}).json()["engine"] == "rules"
    assert client.post("/summary", json={"lang": "en", "messages": MESSAGES}).json()["engine"] == "fallback"
    assert client.post("/replies", json={"lang": "en", "text": "hi"}).json()["engine"] == "fallback"
    assert network_calls == []


# ---- resting ------------------------------------------------------------------


def test_overloaded_models_rest(make_client, monkeypatch):
    seen = fake_send(monkeypatch, lambda req: httpx.Response(503, json={"error": {"message": "overloaded"}}))
    client = make_client(TRANSLATE_API_KEY="fake-key")
    assert client.post("/shield/scan", json={"text": KYC, "lang": "en"}).json()["engine"] == "rules"
    assert len(seen) == 3
    llm = client.app.state.llm
    assert set(llm._resting) == {"gemini:gemini-3.8-flash", "gemini:gemini-flash-lite-latest", "gemini:gemini-3.5-flash-lite"}


def test_daily_quota_rests_one_hour_and_falls_back(make_client, monkeypatch):
    def handler(req):
        if "gemini-3.8-flash" in str(req.url):
            return httpx.Response(429, json={"error": {"message": "quota GenerateRequestsPerDay exceeded"}})
        return gemini_reply({"level": "danger", "category": "kyc_bank", "explanation": "The bank never asks this."})

    seen = fake_send(monkeypatch, handler)
    client = make_client(TRANSLATE_API_KEY="fake-key")
    body = client.post("/shield/scan", json={"text": KYC, "lang": "en"}).json()
    assert body["engine"] == "ai" and body["explanation"] == "The bank never asks this."
    assert [str(r.url).split("/models/")[1].split(":")[0] for r in seen] == ["gemini-3.8-flash", "gemini-flash-lite-latest"]
    llm = client.app.state.llm
    import time

    assert llm._resting["gemini:gemini-3.8-flash"] - time.monotonic() > 3000
    # Next request skips the resting model.
    client.post("/shield/scan", json={"text": OTP, "lang": "en"})
    assert "gemini-3.8-flash" not in str(seen[-1].url)


def test_model_not_found_rests_until_restart(make_client, monkeypatch):
    fake_send(monkeypatch, lambda req: httpx.Response(404, json={"error": {"message": "not found"}}))
    client = make_client(TRANSLATE_API_KEY="fake-key", AI_FALLBACK_MODELS="")
    client.post("/shield/scan", json={"text": KYC, "lang": "en"})
    assert client.app.state.llm._resting["gemini:gemini-3.8-flash"] == float("inf")


# ---- successful provider calls ------------------------------------------------


def test_gemini_request_and_rule_floor(make_client, monkeypatch):
    seen = fake_send(monkeypatch, lambda req: gemini_reply({"level": "safe", "category": "none", "explanation": "यह सामान्य संदेश है।"}))
    client = make_client(TRANSLATE_API_KEY="fake-key", AI_MODEL="gemini-test", AI_FALLBACK_MODELS="")

    # Rule score 100 stays danger even when the LLM says safe.
    body = client.post("/shield/scan", json={"text": SCAM, "lang": "hi"}).json()
    assert body["level"] == "danger" and body["engine"] == "ai"
    assert body["category"] == "family_emergency"  # LLM said "none": keep the rule category
    assert body["explanation"] == "यह सामान्य संदेश है।"

    req = seen[0]
    assert str(req.url) == "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent"
    assert req.headers["x-goog-api-key"] == "fake-key"
    sent = json.loads(req.content)
    assert sent["generationConfig"]["temperature"] == 0
    assert sent["generationConfig"]["responseMimeType"] == "application/json"
    assert sent["generationConfig"]["responseSchema"]["type"] == "OBJECT"

    # Rule score 60 (>= 50): LLM "safe" becomes caution.
    assert client.post("/shield/scan", json={"text": KYC, "lang": "hi"}).json()["level"] == "caution"
    # Rule score 45 (< 50): the LLM may call it safe.
    safe = client.post("/shield/scan", json={"text": OTP, "lang": "hi"}).json()
    assert safe["level"] == "safe" and safe["advice"] == [] and safe["title"] == "यह सुरक्षित लगता है"


def test_llm_can_raise_level(make_client, monkeypatch):
    fake_send(monkeypatch, lambda req: gemini_reply({"level": "danger", "category": "otp", "explanation": "Never share an OTP."}))
    client = make_client(TRANSLATE_API_KEY="fake-key")
    body = client.post("/shield/scan", json={"text": OTP, "lang": "en"}).json()
    assert body["level"] == "danger" and body["category"] == "otp" and body["title"] == "This may be a scam"


def test_explanation_in_wrong_script_is_dropped(make_client, monkeypatch):
    fake_send(monkeypatch, lambda req: gemini_reply({"level": "danger", "category": "otp", "explanation": "Never share an OTP."}))
    client = make_client(TRANSLATE_API_KEY="fake-key")
    body = client.post("/shield/scan", json={"text": OTP, "lang": "ta"}).json()
    assert body["engine"] == "ai" and body["explanation"] is None


def test_anthropic_request_and_parse(make_client, monkeypatch):
    seen = fake_send(
        monkeypatch,
        lambda req: anthropic_reply('Sure: {"replies": ["👍 हाँ, आऊँगी", "बहुत अच्छा 🙏", "यह जवाब बहुत ही ज़्यादा लंबा है और चालीस अक्षरों से अधिक है"]} done'),
    )
    client = make_client(TRANSLATE_API_KEY="fake-key", TRANSLATE_PROVIDER="anthropic")
    body = client.post("/replies", json={"lang": "hi", "text": "Lunch at 12:30 on Sunday?", "sender": "Arjun"}).json()
    assert body["engine"] == "ai"
    assert body["replies"][:2] == ["👍 हाँ, आऊँगी", "बहुत अच्छा 🙏"]
    assert len(body["replies"]) == 3 and all(len(r) <= 40 for r in body["replies"])
    req = seen[0]
    assert str(req.url) == "https://api.anthropic.com/v1/messages"
    assert req.headers["x-api-key"] == "fake-key"
    assert req.headers["anthropic-version"] == "2023-06-01"
    sent = json.loads(req.content)
    assert sent["model"] == "claude-haiku-5-5" and sent["temperature"] == 0.4


def test_summary_ai_and_bad_output(make_client, monkeypatch):
    replies = iter(
        [
            gemini_reply({"lines": ["Arjun asked about lunch."], "spoken": "Hello."}),  # English: wrong for hi
            gemini_reply({"lines": ["अर्जुन ने रविवार 12:30 बजे लंच पूछा।", "पापा आएँगे।"], "spoken": "नमस्ते दादी। अर्जुन ने लंच पूछा।"}),
        ]
    )
    fake_send(monkeypatch, lambda req: next(replies))
    client = make_client(TRANSLATE_API_KEY="fake-key")
    body = client.post("/summary", json={"lang": "hi", "reader": "दादी", "messages": MESSAGES}).json()
    assert body["engine"] == "ai"
    assert body["lines"] == ["अर्जुन ने रविवार 12:30 बजे लंच पूछा।", "पापा आएँगे।"]


def test_garbage_output_falls_back(make_client, monkeypatch):
    fake_send(monkeypatch, lambda req: httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "not json"}]}}]}))
    client = make_client(TRANSLATE_API_KEY="fake-key")
    assert client.post("/summary", json={"lang": "en", "messages": MESSAGES}).json()["engine"] == "fallback"
    assert client.post("/replies", json={"lang": "en", "text": "hi"}).json()["engine"] == "fallback"
    assert client.post("/shield/scan", json={"text": KYC, "lang": "en"}).json()["engine"] == "rules"


# ---- errors and cache ---------------------------------------------------------


def test_unexpected_error_is_json_500(monkeypatch, network_calls):
    monkeypatch.setenv("AI_MOCK", "1")

    async def boom(self, *a, **k):
        raise RuntimeError("secret internals")

    monkeypatch.setattr(Shield, "_scan", boom)
    client = TestClient(create_app(load_settings()), raise_server_exceptions=False)
    r = client.post("/shield/scan", json={"text": SCAM, "lang": "en"})
    assert r.status_code == 500
    assert r.json() == {"error": "internal error"}
    assert "secret" not in r.text


def test_cache_dedupes_in_flight():
    cache = TTLCache()
    calls = 0

    async def factory():
        nonlocal calls
        calls += 1
        await asyncio.sleep(0.05)
        return {"v": 1}

    async def main():
        return await asyncio.gather(*(cache.get_or_compute("k", factory) for _ in range(5)))

    results = asyncio.run(main())
    assert calls == 1
    assert [cached for _, cached in results].count(False) == 1
    assert all(v == {"v": 1} for v, _ in results)


def test_cache_ttl_and_lru():
    cache = TTLCache(maxsize=2, ttl=100)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.get("a")
    cache.set("c", 3)  # evicts b (least recently used)
    assert cache.get("b") == (False, None)
    assert cache.get("a") == (True, 1)
    cache.set("d", 4, ttl=-1)
    assert cache.get("d") == (False, None)


@pytest.mark.parametrize("env,fallbacks", [({}, ("gemini-flash-lite-latest", "gemini-3.5-flash-lite")), ({"TRANSLATE_FALLBACK_MODELS": "a, b"}, ("a", "b")), ({"AI_FALLBACK_MODELS": "c", "TRANSLATE_FALLBACK_MODELS": "a"}, ("c",))])
def test_fallback_config(monkeypatch, env, fallbacks):
    for k in ("AI_MOCK", "TRANSLATE_MOCK", "AI_FALLBACK_MODELS", "TRANSLATE_FALLBACK_MODELS", "AI_MODEL", "TRANSLATE_PROVIDER"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("TRANSLATE_API_KEY", "k")
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    s = load_settings()
    assert s.fallbacks == fallbacks
    assert "api_key" not in repr(s)  # the key never shows up in logs of the settings


# ---- Sarvam provider, with Gemini as backup -------------------------------------


def test_sarvam_request_and_parse(make_client, monkeypatch):
    seen = []

    def handler(req):
        seen.append(req)
        content = '<think>x</think>{"level": "danger", "category": "kyc_bank", "explanation": "Banks never ask for KYC by SMS."}'
        return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})

    fake_send(monkeypatch, handler)
    client = make_client(TRANSLATE_PROVIDER="sarvam", SARVAM_API_KEY="sk_test", TRANSLATE_API_KEY="")
    r = client.post("/shield/scan", json={"text": KYC, "lang": "en"}).json()
    assert r["engine"] == "ai" and r["explanation"] == "Banks never ask for KYC by SMS."
    req = seen[0]
    assert str(req.url) == "https://api.sarvam.ai/v1/chat/completions"
    assert req.headers["api-subscription-key"] == "sk_test"
    body = json.loads(req.content)
    assert body["model"] == "sarvam-105b" and body["reasoning_effort"] is None
    assert client.get("/health").json()["llm"] == "sarvam"


def test_sarvam_out_of_credits_falls_back_to_gemini(make_client, monkeypatch):
    hosts = []

    def handler(req):
        hosts.append(req.url.host)
        if req.url.host == "api.sarvam.ai":
            return httpx.Response(402, json={"error": {"message": "insufficient credits"}})
        out = '{"level": "danger", "category": "kyc_bank", "explanation": "Fake bank message."}'
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": out}]}}]})

    fake_send(monkeypatch, handler)
    client = make_client(TRANSLATE_PROVIDER="sarvam", SARVAM_API_KEY="sk_test", TRANSLATE_API_KEY="gemini-key")
    r = client.post("/shield/scan", json={"text": KYC, "lang": "en"}).json()
    assert r["engine"] == "ai" and r["explanation"] == "Fake bank message."
    assert hosts[0] == "api.sarvam.ai" and "generativelanguage.googleapis.com" in hosts
    assert client.app.state.llm._resting["sarvam:sarvam-105b"] - time.monotonic() > 3000
