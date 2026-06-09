"""Modelo de dados do documento processado."""
from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from database.session import Base


def _agora() -> datetime:
    """Horário atual em UTC (timezone-aware)."""
    return datetime.now(UTC)


class Document(Base):
    """Representa um documento enviado e o resultado da sua análise."""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(512))
    mime_type: Mapped[str] = mapped_column(String(100))

    # Resultado da análise (preenchido pelo pipeline).
    doc_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    analysis_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # processing | done | error
    status: Mapped[str] = mapped_column(String(20), default="processing")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_agora
    )
