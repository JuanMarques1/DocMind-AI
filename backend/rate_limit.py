"""Rate limiting por IP (slowapi), com suporte ao proxy do Render."""
from slowapi import Limiter
from starlette.requests import Request

from config import settings


def client_ip(request: Request) -> str:
    """IP real do cliente; atrás do proxy, vem em X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=client_ip, enabled=settings.rate_limit_enabled)
