"""Configurações da aplicação, carregadas de variáveis de ambiente / .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings centralizadas do DocMind AI."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # IA
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    # Autenticação (JWT). Em produção, defina SECRET_KEY com um valor aleatório.
    secret_key: str = "dev-insecure-secret-change-me"
    access_token_expire_days: int = 7

    # Banco de dados (SQLite local; Postgres em produção via DATABASE_URL)
    database_url: str = "sqlite:///./docmind.db"

    # Origem do frontend permitida no CORS (ex.: https://docmind.vercel.app).
    # Vazio → libera todas as origens (conveniente para desenvolvimento).
    frontend_origin: str | None = None

    # Uploads
    upload_dir: str = "uploads"
    max_file_size_mb: int = 10
    allowed_extensions: set[str] = {"pdf", "png", "jpg", "jpeg"}


settings = Settings()
