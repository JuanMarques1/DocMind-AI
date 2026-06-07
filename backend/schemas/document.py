"""Schemas Pydantic para entrada e saída da API."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AnalysisResult(BaseModel):
    """Resultado estruturado da análise de IA."""

    tipo: str
    resumo: str
    informacoes: dict[str, Any] = {}


class DocumentRead(BaseModel):
    """Representação resumida de um documento (listagens)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    mime_type: str
    doc_type: str | None
    summary: str | None
    status: str
    error: str | None
    created_at: datetime


class DocumentDetail(DocumentRead):
    """Documento com o resultado completo da análise."""

    analysis: AnalysisResult | None = None


class TipoContagem(BaseModel):
    """Contagem de documentos por tipo identificado."""

    tipo: str
    total: int


class StatsResponse(BaseModel):
    """Dados agregados para o dashboard."""

    total: int
    por_tipo: list[TipoContagem]
    ultimos: list[DocumentRead]
