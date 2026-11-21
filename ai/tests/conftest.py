import httpx
import pytest
from fastapi.testclient import TestClient

from aangan_ai.config import load_settings
from aangan_ai.main import create_app

ENV_VARS = (
    "AI_MOCK",
    "TRANSLATE_MOCK",
    "TRANSLATE_API_KEY",
    "TRANSLATE_PROVIDER",
    "TRANSLATE_MODEL",
    "AI_MODEL",
    "AI_FALLBACK_MODELS",
    "TRANSLATE_FALLBACK_MODELS",
    "AI_INTERNAL_TOKEN",
    "AI_PORT",
    "SARVAM_API_KEY",
    "BACKUP_PROVIDER",
)


@pytest.fixture
def network_calls(monkeypatch):
    """Records (and blocks) every outgoing httpx request."""
    calls = []

    async def blocked_send(self, request, *args, **kwargs):
        calls.append(str(request.url))
        raise httpx.ConnectError("network is disabled in tests", request=request)

    monkeypatch.setattr(httpx.AsyncClient, "send", blocked_send)
    return calls


@pytest.fixture
def make_client(monkeypatch, network_calls):
    def make(**env):
        for name in ENV_VARS:
            monkeypatch.delenv(name, raising=False)
        for name, value in env.items():
            monkeypatch.setenv(name, value)
        return TestClient(create_app(load_settings()))

    return make


@pytest.fixture
def mock_client(make_client):
    return make_client(AI_MOCK="1")
