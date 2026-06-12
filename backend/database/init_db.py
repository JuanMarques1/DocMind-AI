"""Inicialização do schema do banco de dados."""
from database.session import Base, engine

# Importa os modelos para que sejam registrados na metadata do Base.
from models.document import Document  # noqa: F401
from models.user import User  # noqa: F401


def init_db() -> None:
    """Cria todas as tabelas, se ainda não existirem."""
    Base.metadata.create_all(bind=engine)
