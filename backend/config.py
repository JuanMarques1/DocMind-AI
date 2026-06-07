"""Configurações da aplicação, carregadas de variáveis de ambiente / .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings centralizadas do DocMind AI."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # IA
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    # Banco de dados
    database_url: str = "sqlite:///./docmind.db"

    # Uploads
    upload_dir: str = "uploads"
    max_file_size_mb: int = 10
    allowed_extensions: set[str] = {"pdf", "png", "jpg", "jpeg"}


settings = Settings()
