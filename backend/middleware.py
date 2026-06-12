"""Middlewares HTTP da aplicação (headers de segurança)."""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from config import settings

# Headers enviados em toda resposta. O CSP é mínimo porque este backend é uma
# API (JSON e arquivos); o CSP do frontend pertence ao nginx/Vercel.
_HEADERS_FIXOS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adiciona headers de proteção a todas as respostas."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        for nome, valor in _HEADERS_FIXOS.items():
            response.headers[nome] = valor
        if settings.hsts_enabled:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains"
            )
        return response
