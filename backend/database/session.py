"""Configuração da sessão SQLAlchemy (síncrona) com SQLite."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import settings


def _normalizar_url(url: str) -> str:
    """Ajusta a URL do banco para o formato esperado pelo SQLAlchemy.

    O Render fornece a connection string como ``postgres://``, mas o SQLAlchemy
    exige ``postgresql://``.
    """
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


_database_url = _normalizar_url(settings.database_url)

# check_same_thread só se aplica ao SQLite (FastAPI roda endpoints síncronos
# em threads diferentes do threadpool).
_connect_args = (
    {"check_same_thread": False} if _database_url.startswith("sqlite") else {}
)

engine = create_engine(
    _database_url,
    connect_args=_connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Classe base declarativa para os modelos."""


def get_db() -> Generator[Session, None, None]:
    """Dependency do FastAPI: fornece uma sessão e garante o fechamento."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
