"""Rota de estatísticas para o dashboard."""
from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from api.deps import get_current_user
from database.session import get_db
from models.document import Document
from models.user import User
from schemas.document import StatsResponse, TipoContagem

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
def obter_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StatsResponse:
    """Retorna total, contagem por tipo e os últimos uploads do usuário."""
    base = db.query(Document).filter(Document.user_id == user.id)
    total = base.count()

    por_tipo = [
        TipoContagem(tipo=tipo or "Desconhecido", total=qtd)
        for tipo, qtd in (
            db.query(Document.doc_type, func.count(Document.id))
            .filter(Document.user_id == user.id)
            .group_by(Document.doc_type)
            .all()
        )
    ]

    ultimos = base.order_by(desc(Document.created_at)).limit(5).all()

    return StatsResponse(total=total, por_tipo=por_tipo, ultimos=ultimos)
