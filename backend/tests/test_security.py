"""Testes das medidas de hardening: headers, upload e rate limit."""
from config import settings


def test_headers_de_seguranca_presentes(client):
    r = client.get("/api/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"
    assert (
        r.headers["Content-Security-Policy"]
        == "default-src 'none'; frame-ancestors 'none'"
    )
    # HSTS desligado por padrão (dev local em HTTP).
    assert "Strict-Transport-Security" not in r.headers


def test_hsts_quando_habilitado(client, monkeypatch):
    monkeypatch.setattr(settings, "hsts_enabled", True)
    r = client.get("/api/health")
    assert "max-age=63072000" in r.headers["Strict-Transport-Security"]
