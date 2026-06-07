"""Testes de integração das rotas da API."""
import fitz


def _pdf_bytes() -> bytes:
    doc = fitz.open()
    pagina = doc.new_page()
    pagina.insert_text((72, 72), "Joao Silva joao@email.com Curriculo")
    conteudo = doc.tobytes()
    doc.close()
    return conteudo


def test_upload_e_detalhe(client):
    r = client.post(
        "/api/documents",
        files={"file": ("cv.pdf", _pdf_bytes(), "application/pdf")},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "done"
    assert data["analysis"]["tipo"]
    doc_id = data["id"]

    assert client.get(f"/api/documents/{doc_id}").status_code == 200
    assert client.get("/api/documents").status_code == 200

    download = client.get(f"/api/documents/{doc_id}/download")
    assert download.status_code == 200
    assert "tipo" in download.json()

    stats = client.get("/api/stats").json()
    assert stats["total"] >= 1


def test_extensao_invalida(client):
    r = client.post(
        "/api/documents",
        files={"file": ("x.txt", b"oi", "text/plain")},
    )
    assert r.status_code == 400


def test_documento_inexistente(client):
    assert client.get("/api/documents/9999").status_code == 404
