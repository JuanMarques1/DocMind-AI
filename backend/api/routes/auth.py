"""Rotas de autenticação: cadastro, login e perfil."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from api.deps import get_current_user
from database.session import get_db
from models.user import User
from schemas.user import LoginRequest, Token, UserCreate, UserRead
from services.auth import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _token_response(user: User) -> Token:
    """Monta a resposta com token + dados públicos do usuário."""
    return Token(
        access_token=create_access_token(user.id),
        user=UserRead.model_validate(user),
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(dados: UserCreate, db: Session = Depends(get_db)) -> Token:
    """Cria uma conta nova e devolve um token de acesso."""
    existente = db.query(User).filter(User.email == dados.email).first()
    if existente:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email já cadastrado.")
    user = User(
        email=dados.email, hashed_password=hash_password(dados.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=Token)
def login(dados: LoginRequest, db: Session = Depends(get_db)) -> Token:
    """Valida credenciais e devolve um token de acesso."""
    user = db.query(User).filter(User.email == dados.email).first()
    if not user or not verify_password(dados.password, user.hashed_password):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Email ou senha inválidos."
        )
    return _token_response(user)


@router.get("/me", response_model=UserRead)
def me(current: User = Depends(get_current_user)) -> User:
    """Retorna o usuário autenticado."""
    return current
