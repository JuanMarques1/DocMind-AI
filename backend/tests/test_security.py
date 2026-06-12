"""Testes das medidas de hardening: headers, upload e rate limit."""
import pytest
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


def test_headers_presentes_em_respostas_de_erro(client):
    # Mesmo um 401 (rota protegida sem token) deve sair com os headers.
    r = client.get("/api/documents/9999")
    assert r.status_code == 401
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"


def test_client_ip_usa_ultimo_ip_do_x_forwarded_for():
    from starlette.requests import Request

    from rate_limit import client_ip

    def _req(headers: list[tuple[bytes, bytes]]) -> Request:
        return Request(
            {
                "type": "http",
                "headers": headers,
                "client": ("10.0.0.1", 1234),
                "method": "GET",
                "path": "/",
                "query_string": b"",
            }
        )

    # O último IP é o anexado pelo proxy confiável; os primeiros são forjáveis.
    r = _req([(b"x-forwarded-for", b"6.6.6.6, 203.0.113.9")])
    assert client_ip(r) == "203.0.113.9"

    # Sem o header, cai no IP da conexão.
    assert client_ip(_req([])) == "10.0.0.1"


def test_conteudo_corresponde_assinaturas():
    from services.upload_validation import conteudo_corresponde

    assert conteudo_corresponde("pdf", b"%PDF-1.7 resto") is True
    assert conteudo_corresponde("pdf", b"MZ\x90\x00") is False
    assert conteudo_corresponde("png", b"\x89PNG\r\n\x1a\n" + b"x") is True
    assert conteudo_corresponde("jpg", b"\xff\xd8\xff\xe0") is True
    assert conteudo_corresponde("jpeg", b"\xff\xd8\xff\xe1") is True
    assert conteudo_corresponde("exe", b"MZ") is False


def test_upload_conteudo_falso_rejeitado(auth_client):
    r = auth_client.post(
        "/api/documents",
        files={"file": ("x.pdf", b"isto e so texto puro", "application/pdf")},
    )
    assert r.status_code == 400


def test_upload_png_renomeado_para_pdf_rejeitado(auth_client):
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
    r = auth_client.post(
        "/api/documents",
        files={"file": ("x.pdf", png, "application/pdf")},
    )
    assert r.status_code == 400


def test_upload_arquivo_vazio_rejeitado(auth_client):
    r = auth_client.post(
        "/api/documents",
        files={"file": ("x.pdf", b"", "application/pdf")},
    )
    assert r.status_code == 400


@pytest.fixture()
def rate_limited_client(client):
    """Reativa o rate limiting (desligado por padrão nos testes) com estado limpo."""
    from rate_limit import limiter

    limiter.reset()
    limiter.enabled = True
    yield client
    limiter.enabled = False
    limiter.reset()


def test_login_estoura_limite(rate_limited_client):
    body = {"email": "x@x.com", "password": "errada"}
    for _ in range(5):
        assert (
            rate_limited_client.post("/api/auth/login", json=body).status_code
            == 401
        )
    assert rate_limited_client.post("/api/auth/login", json=body).status_code == 429


def test_register_estoura_limite(rate_limited_client):
    for i in range(3):
        r = rate_limited_client.post(
            "/api/auth/register",
            json={"email": f"u{i}@x.com", "password": "senha123"},
        )
        assert r.status_code == 201
    r = rate_limited_client.post(
        "/api/auth/register",
        json={"email": "u9@x.com", "password": "senha123"},
    )
    assert r.status_code == 429
