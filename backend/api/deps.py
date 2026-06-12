"""Dependencies compartilhadas das rotas (autenticação)."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database.session import get_db
from models.user import User
from services.auth import decode_token

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Resolve o usuário a partir do header `Authorization: Bearer <token>`."""
    erro = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if cred is None:
        raise erro
    user_id = decode_token(cred.credentials)
    if user_id is None:
        raise erro
    user = db.get(User, user_id)
    if user is None:
        raise erro
    return user
