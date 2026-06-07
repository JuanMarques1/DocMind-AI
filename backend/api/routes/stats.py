"""Rota de estatísticas para o dashboard."""
from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database.session import get_db
from models.document import Document
from schemas.document import StatsResponse, TipoContagem

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
def obter_stats(db: Session = Depends(get_db)) -> StatsResponse:
    """Retorna total, contagem por tipo e os últimos uploads."""
    total = db.query(Document).count()

    por_tipo = [
        TipoContagem(tipo=tipo or "Desconhecido", total=qtd)
        for tipo, qtd in (
            db.query(Document.doc_type, func.count(Document.id))
            .group_by(Document.doc_type)
            .all()
        )
    ]

    ultimos = (
        db.query(Document).order_by(desc(Document.created_at)).limit(5).all()
    )

    return StatsResponse(total=total, por_tipo=por_tipo, ultimos=ultimos)
