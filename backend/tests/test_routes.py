"""Testes de integração das rotas de documentos."""
import fitz


def _pdf_bytes() -> bytes:
    doc = fitz.open()
    pagina = doc.new_page()
    pagina.insert_text((72, 72), "Joao Silva joao@email.com Curriculo")
    conteudo = doc.tobytes()
    doc.close()
    return conteudo


def _upload(client) -> int:
    r = client.post(
        "/api/documents",
        files={"file": ("cv.pdf", _pdf_bytes(), "application/pdf")},
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_upload_e_detalhe(auth_client):
    doc_id = _upload(auth_client)

    detalhe = auth_client.get(f"/api/documents/{doc_id}")
    assert detalhe.status_code == 200
    assert detalhe.json()["analysis"]["tipo"]

    assert auth_client.get("/api/documents").status_code == 200

    download = auth_client.get(f"/api/documents/{doc_id}/download")
    assert download.status_code == 200
    assert "tipo" in download.json()

    stats = auth_client.get("/api/stats").json()
    assert stats["total"] >= 1


def test_extensao_invalida(auth_client):
    r = auth_client.post(
        "/api/documents",
        files={"file": ("x.txt", b"oi", "text/plain")},
    )
    assert r.status_code == 400


def test_documento_inexistente(auth_client):
    assert auth_client.get("/api/documents/9999").status_code == 404


def test_sem_token_bloqueia(client):
    assert client.get("/api/documents").status_code == 401
    assert client.post("/api/documents").status_code == 401


def test_isolamento_entre_usuarios(client):
    # Usuário A registra e envia um documento.
    token_a = client.post(
        "/api/auth/register",
        json={"email": "a@test.com", "password": "senha123"},
    ).json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token_a}"})
    doc_id = _upload(client)

    # Usuário B não enxerga o documento de A.
    token_b = client.post(
        "/api/auth/register",
        json={"email": "b@test.com", "password": "senha123"},
    ).json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token_b}"})

    assert client.get("/api/documents").json() == []
    assert client.get(f"/api/documents/{doc_id}").status_code == 404
    assert client.get(f"/api/documents/{doc_id}/file").status_code == 404
    assert client.get(f"/api/documents/{doc_id}/download").status_code == 404
