"""Aplicação FastAPI principal do DocMind AI."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import documents, stats
from database.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Cria as tabelas do banco ao iniciar a aplicação."""
    init_db()
    yield


app = FastAPI(title="DocMind AI", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router)
app.include_router(stats.router)


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    """Endpoint simples de verificação de saúde."""
    return {"status": "ok"}
