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
