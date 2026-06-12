"""Aplicação FastAPI principal do DocMind AI."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import auth, documents, stats
from config import settings
from database.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Cria as tabelas do banco ao iniciar a aplicação."""
    init_db()
    yield


app = FastAPI(title="DocMind AI", version="1.0.0", lifespan=lifespan)

# Em produção, defina FRONTEND_ORIGIN com o domínio da Vercel. Sem ele, libera tudo.
if settings.frontend_origin:
    _origins = [
        settings.frontend_origin,
        "http://localhost:5173",
        "http://localhost:3000",
    ]
else:
    _origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(stats.router)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    """Endpoint simples de verificação de saúde."""
    return {"status": "ok"}
