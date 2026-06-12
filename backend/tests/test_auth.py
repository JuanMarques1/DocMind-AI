"""Testes das rotas de autenticação."""


def _registrar(client, email="a@a.com", senha="senha123"):
    return client.post(
        "/api/auth/register", json={"email": email, "password": senha}
    )


def test_register_sucesso(client):
    r = _registrar(client)
    assert r.status_code == 201
    body = r.json()
    assert body["access_token"]
    assert body["user"]["email"] == "a@a.com"
    assert "hashed_password" not in body["user"]


def test_register_email_duplicado(client):
    _registrar(client)
    r = _registrar(client)
    assert r.status_code == 409


def test_register_senha_curta(client):
    r = client.post(
        "/api/auth/register", json={"email": "c@c.com", "password": "123"}
    )
    assert r.status_code == 422


def test_register_email_invalido(client):
    r = client.post(
        "/api/auth/register", json={"email": "nao-email", "password": "x"}
    )
    assert r.status_code == 422


def test_login_sucesso(client):
    _registrar(client)
    r = client.post(
        "/api/auth/login", json={"email": "a@a.com", "password": "senha123"}
    )
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_login_senha_errada(client):
    _registrar(client)
    r = client.post(
        "/api/auth/login", json={"email": "a@a.com", "password": "errada"}
    )
    assert r.status_code == 401


def test_login_usuario_inexistente(client):
    r = client.post(
        "/api/auth/login", json={"email": "ninguem@a.com", "password": "x"}
    )
    assert r.status_code == 401


def test_me_retorna_usuario(client):
    token = _registrar(client).json()["access_token"]
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "a@a.com"


def test_me_sem_token(client):
    assert client.get("/api/auth/me").status_code == 401
