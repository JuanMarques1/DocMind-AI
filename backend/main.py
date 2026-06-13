"""Aplicação FastAPI principal do DocMind AI."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from api.routes import auth, documents, stats
from config import settings
from database.init_db import init_db
from middleware import SecurityHeadersMiddleware
from rate_limit import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Cria as tabelas do banco ao iniciar a aplicação."""
    init_db()
    yield


app = FastAPI(title="DocMind AI", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Origens liberadas no CORS. FRONTEND_ORIGIN traz o(s) domínio(s) de produção
# (aceita lista separada por vírgula); normalizamos barra/espaço acidentais para
# evitar mismatch. A regex cobre os deploys do projeto na Vercel — produção e as
# URLs de preview, que têm sufixos variáveis.
def _origens_permitidas() -> list[str]:
    origens = ["http://localhost:5173", "http://localhost:3000"]
    if settings.frontend_origin:
        for origem in settings.frontend_origin.split(","):
            origem = origem.strip().rstrip("/")
            if origem:
                origens.append(origem)
    return origens


app.add_middleware(
    CORSMiddleware,
    allow_origins=_origens_permitidas(),
    allow_origin_regex=r"https://doc-mind-ai.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(stats.router)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    """Endpoint simples de verificação de saúde."""
    return {"status": "ok"}
