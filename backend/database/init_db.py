"""Inicialização do schema do banco de dados."""
from database.session import Base, engine
# Importa o modelo para que ele seja registrado na metadata do Base.
from models.document import Document  # noqa: F401


def init_db() -> None:
    """Cria todas as tabelas, se ainda não existirem."""
    Base.metadata.create_all(bind=engine)
