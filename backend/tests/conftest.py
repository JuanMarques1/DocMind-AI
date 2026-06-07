"""Fixtures de teste: banco em memória e cliente da API."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from config import settings
from database.session import Base, get_db
from main import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
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
