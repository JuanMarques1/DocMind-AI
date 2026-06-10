"""Schemas Pydantic para usuários e autenticação."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    """Dados de cadastro."""

    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    """Credenciais de login."""

    email: EmailStr
    password: str


class UserRead(BaseModel):
    """Representação pública do usuário (sem o hash da senha)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    created_at: datetime


class Token(BaseModel):
    """Resposta de register/login."""

    access_token: str
    token_type: str = "bearer"
    user: UserRead
