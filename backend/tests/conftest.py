"""Fixtures de teste: banco em memória e cliente da API."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from config import settings
from database.session import Base, get_db
from main import app
from rate_limit import limiter


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # Rate limiting desligado por padrão (testes dedicados reativam).
    limiter.enabled = False
    # Garante uso do analisador mock (sem chamadas externas).
    monkeypatch.setattr(settings, "openai_api_key", None)
    # Uploads em diretório temporário do teste.
    monkeypatch.setattr(settings, "upload_dir", str(tmp_path / "uploads"))

    # Banco SQLite em memória, compartilhado entre conexões da mesma sessão.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    def _get_db_override():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = _get_db_override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_client(client):
    """Cliente já autenticado: registra um usuário e fixa o header Bearer."""
    token = client.post(
        "/api/auth/register",
        json={"email": "user@test.com", "password": "senha123"},
    ).json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client
