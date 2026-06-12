"""Hash de senha (bcrypt) e emissão/validação de JWT (HS256)."""
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from config import settings

_ALGORITHM = "HS256"
# bcrypt aceita no máximo 72 bytes; truncamos para evitar erro em senhas longas.
_MAX = 72


def hash_password(senha: str) -> str:
    """Gera o hash bcrypt de uma senha."""
    digest = bcrypt.hashpw(senha.encode()[:_MAX], bcrypt.gensalt())
    return digest.decode()


def verify_password(senha: str, hashed: str) -> bool:
    """Confere uma senha contra o hash armazenado."""
    try:
        return bcrypt.checkpw(senha.encode()[:_MAX], hashed.encode())
    except ValueError:
        return False


def create_access_token(user_id: int) -> str:
    """Cria um JWT assinado com `sub=user_id` e expiração configurável."""
    expira = datetime.now(UTC) + timedelta(days=settings.access_token_expire_days)
    payload = {"sub": str(user_id), "exp": expira}
    return jwt.encode(payload, settings.secret_key, algorithm=_ALGORITHM)


def decode_token(token: str) -> int | None:
    """Valida o token e devolve o user_id, ou None se inválido/expirado."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[_ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
