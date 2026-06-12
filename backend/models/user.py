"""Modelo de dados do usuário."""
from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database.session import Base


def _agora() -> datetime:
    """Horário atual em UTC (timezone-aware)."""
    return datetime.now(UTC)


class User(Base):
    """Conta de usuário com email único e senha hasheada."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_agora
    )
