"""Endpoints with the mock provider (AI_MOCK=1): no network may happen."""

import pytest

SCAM = "Dadi it's me Kabir, I lost my phone, this is my new number. I had an accident, please send ₹15,000 urgently on GPay. Don't tell papa."
LANGS = ["en", "hi", "mr", "ta", "bn"]


def test_health_reports_mock(mock_client):
    r = mock_client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"ok": True, "llm": "mock", "model": "mock"}


def test_health_off_without_key(make_client):
    r = make_client().get("/health")
    assert r.json() == {"ok": True, "llm": "off", "model": None}


def test_health_gemini_defaults(make_client):
    r = make_client(TRANSLATE_API_KEY="test-key-not-real").get("/health")
    assert r.json() == {"ok": True, "llm": "gemini", "model": "gemini-3.8-flash"}
    assert "test-key-not-real" not in r.text


def test_health_anthropic_defaults(make_client):
    r = make_client(TRANSLATE_API_KEY="x", TRANSLATE_PROVIDER="anthropic").get("/health")
    assert r.json() == {"ok": True, "llm": "anthropic", "model": "claude-haiku-5-5"}


# ---- shield -------------------------------------------------------------------

SHIELD_KEYS = {"level", "score", "category", "signals", "title", "advice", "explanation", "engine", "cached"}


@pytest.mark.parametrize("lang", LANGS)
def test_shield_scam_shape(mock_client, network_calls, lang):
    r = mock_client.post("/shield/scan", json={"text": SCAM, "lang": lang})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == SHIELD_KEYS
    assert body["level"] == "danger"
    assert body["score"] == 100
    assert body["category"] == "family_emergency"
    assert body["engine"] == "ai"  # mock provider stands in for the AI
    assert body["explanation"]
    assert 1 <= len(body["advice"]) <= 3
    assert body["signals"] and all(isinstance(s, str) for s in body["signals"])
    assert body["cached"] is False
    assert network_calls == []


def test_shield_hindi_title(mock_client):
    body = mock_client.post("/shield/scan", json={"text": SCAM, "lang": "hi"}).json()
    assert body["title"] == "यह धोखा हो सकता है"
    assert "पहले उनके पुराने नंबर पर फ़ोन करें।" in body["advice"]


def test_shield_safe(mock_client):
    body = mock_client.post("/shield/scan", json={"text": "Did you take your BP medicine?", "lang": "en"}).json()
    assert body["level"] == "safe"
    assert body["title"] == "Looks safe"
    assert body["advice"] == [] and body["signals"] == []
    assert body["category"] is None and body["explanation"] is None
    assert body["engine"] == "rules"


def test_shield_caution_band(mock_client):
    body = mock_client.post("/shield/scan", json={"text": "Please share the OTP you received just now.", "lang": "en"}).json()
    assert body["level"] == "caution"
    assert body["category"] == "otp"


def test_shield_shallow_uses_rules(mock_client):
    body = mock_client.post("/shield/scan", json={"text": SCAM, "lang": "en", "deep": False}).json()
    assert body["engine"] == "rules"
    assert body["level"] == "danger"
    assert body["explanation"] is None


def test_shield_cache(mock_client):
    payload = {"text": SCAM, "lang": "mr"}
    first = mock_client.post("/shield/scan", json=payload).json()
    second = mock_client.post("/shield/scan", json=payload).json()
    assert first["cached"] is False and second["cached"] is True
    assert {**first, "cached": True} == second
    other = mock_client.post("/shield/scan", json={**payload, "lang": "ta"}).json()
    assert other["cached"] is False


# ---- summary ------------------------------------------------------------------

MESSAGES = [
    {"sender": "Arjun", "text": "Dadi, I will pick you up at 12:30 for lunch.", "at": 1},
    {"sender": "Papa", "text": "Did you take your BP medicine?", "at": 2},
    {"sender": "Arjun", "text": "Wear the blue shawl 🙂", "at": 3},
]


def test_summary_mock(mock_client, network_calls):
    r = mock_client.post("/summary", json={"lang": "en", "reader": "Dadi", "messages": MESSAGES})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"lines", "spoken", "engine", "cached"}
    assert body["engine"] == "ai"
    assert 1 <= len(body["lines"]) <= 5
    assert body["lines"][0] == "3 new messages from Arjun, Papa."
    assert "Arjun sent 2 messages." in body["lines"]
    assert body["spoken"].startswith("Hello Dadi.")
    assert body["cached"] is False
    again = mock_client.post("/summary", json={"lang": "en", "reader": "Dadi", "messages": MESSAGES}).json()
    assert again["cached"] is True
    assert network_calls == []


@pytest.mark.parametrize("lang", LANGS)
def test_summary_all_langs(mock_client, lang):
    body = mock_client.post("/summary", json={"lang": lang, "messages": MESSAGES}).json()
    assert body["lines"] and body["spoken"]


def test_summary_hindi(mock_client):
    body = mock_client.post("/summary", json={"lang": "hi", "reader": "दादी", "messages": MESSAGES}).json()
    assert body["lines"][0] == "3 नए संदेश: Arjun, Papa से।"
    assert body["spoken"].startswith("नमस्ते दादी।")


# ---- replies ------------------------------------------------------------------


@pytest.mark.parametrize("lang", LANGS)
def test_replies_mock(mock_client, network_calls, lang):
    r = mock_client.post("/replies", json={"lang": lang, "text": "Dadi, I will pick you up at 12:30.", "sender": "Arjun"})
    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"replies", "engine"}
    assert body["engine"] == "ai"
    assert len(body["replies"]) == 3
    assert all(0 < len(x) <= 40 for x in body["replies"])
    assert "Arjun" in body["replies"][0]
    assert network_calls == []


def test_replies_scam_gets_safe_set(mock_client):
    body = mock_client.post("/replies", json={"lang": "en", "text": SCAM}).json()
    assert body == {"replies": ["Who is this?", "I will ask my family", "📞 Call me"], "engine": "fallback"}


# ---- validation ---------------------------------------------------------------


@pytest.mark.parametrize(
    "path,payload",
    [
        ("/shield/scan", {"text": "", "lang": "en"}),
        ("/shield/scan", {"text": "   ", "lang": "en"}),
        ("/shield/scan", {"text": "hello", "lang": "fr"}),
        ("/shield/scan", {"text": "x" * 4001, "lang": "en"}),
        ("/shield/scan", {"lang": "en"}),
        ("/summary", {"lang": "en", "messages": []}),
        ("/summary", {"lang": "en", "messages": [{"sender": "A", "text": "hi"}] * 61}),
        ("/summary", {"lang": "en", "messages": [{"sender": "A" * 41, "text": "hi"}]}),
        ("/summary", {"lang": "en", "reader": "R" * 41, "messages": [{"sender": "A", "text": "hi"}]}),
        ("/summary", {"lang": "xx", "messages": [{"sender": "A", "text": "hi"}]}),
        ("/replies", {"lang": "en", "text": ""}),
        ("/replies", {"lang": "de", "text": "hello"}),
        ("/replies", {"lang": "en", "text": "x" * 2001}),
    ],
)
def test_validation_errors(mock_client, path, payload):
    r = mock_client.post(path, json=payload)
    assert r.status_code == 422
    body = r.json()
    assert set(body) == {"error"} and isinstance(body["error"], str) and body["error"]


def test_malformed_json(mock_client):
    r = mock_client.post("/shield/scan", content=b"{not json", headers={"Content-Type": "application/json"})
    assert r.status_code == 422
    assert "error" in r.json()


def test_unknown_route_is_json(mock_client):
    r = mock_client.get("/nope")
    assert r.status_code == 404
    assert r.json() == {"error": "Not Found"}


# ---- internal token -----------------------------------------------------------


def test_internal_token(make_client):
    client = make_client(AI_MOCK="1", AI_INTERNAL_TOKEN="s3cret")
    assert client.get("/health").status_code == 200  # open
    payload = {"text": "hello", "lang": "en"}
    r = client.post("/shield/scan", json=payload)
    assert r.status_code == 401 and r.json() == {"error": "unauthorized"}
    assert client.post("/shield/scan", json=payload, headers={"X-Internal-Token": "wrong"}).status_code == 401
    assert client.post("/shield/scan", json=payload, headers={"X-Internal-Token": "s3cret"}).status_code == 200
    for path, body in (
        ("/summary", {"lang": "en", "messages": [{"sender": "A", "text": "hi"}]}),
        ("/replies", {"lang": "en", "text": "hi"}),
    ):
        assert client.post(path, json=body).status_code == 401
        assert client.post(path, json=body, headers={"X-Internal-Token": "s3cret"}).status_code == 200
    # Token is checked before validation, so bad bodies do not leak details.
    assert client.post("/shield/scan", json={"text": ""}).status_code == 401


def test_no_token_needed_when_unset(mock_client):
    assert mock_client.post("/replies", json={"lang": "en", "text": "hi"}).status_code == 200
