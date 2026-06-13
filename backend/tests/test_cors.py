"""Testes da configuração de CORS."""
from config import settings
from main import _origens_permitidas

_ORIGEM_VERCEL = "https://doc-mind-ai-tan.vercel.app"


def test_origem_vercel_liberada_por_regex(client):
    r = client.get("/api/health", headers={"Origin": _ORIGEM_VERCEL})
    assert r.headers.get("access-control-allow-origin") == _ORIGEM_VERCEL


def test_preflight_upload_libera_origem_vercel(client):
    r = client.options(
        "/api/documents",
        headers={
            "Origin": _ORIGEM_VERCEL,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert r.headers.get("access-control-allow-origin") == _ORIGEM_VERCEL


def test_origens_normaliza_barra_e_espaco(monkeypatch):
    monkeypatch.setattr(settings, "frontend_origin", " https://meu-site.app/ ")
    origens = _origens_permitidas()
    assert "https://meu-site.app" in origens
    assert "http://localhost:5173" in origens


def test_origens_aceita_lista_separada_por_virgula(monkeypatch):
    monkeypatch.setattr(
        settings, "frontend_origin", "https://a.app, https://b.app/"
    )
    origens = _origens_permitidas()
    assert "https://a.app" in origens
    assert "https://b.app" in origens
