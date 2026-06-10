# Sistema de perfil de usuário (autenticação) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada usuário cria conta (email+senha), faz login e passa a ver/operar apenas os próprios documentos, eliminando a "mistura" do deploy atual.

**Architecture:** Autenticação stateless via JWT (HS256). O backend valida o token numa dependency `get_current_user` e filtra todas as queries por `user_id`. O frontend guarda o token no `localStorage` e o anexa via interceptor do Axios; arquivos protegidos são carregados como blob autenticado.

**Tech Stack:** FastAPI · SQLAlchemy · PyJWT · bcrypt · Pydantic (EmailStr) · React · TypeScript · Axios · React Router.

**Spec:** `docs/superpowers/specs/2026-06-09-perfil-de-usuario-design.md`

---

## Estrutura de arquivos

**Backend — novos:**
- `models/user.py` — modelo `User`.
- `services/auth.py` — hash de senha, criação/validação de JWT.
- `api/deps.py` — dependency `get_current_user`.
- `api/routes/auth.py` — rotas register/login/me.
- `schemas/user.py` — schemas `UserCreate`, `UserRead`, `Token`, `LoginRequest`.

**Backend — alterados:**
- `models/document.py` — adiciona `user_id`.
- `database/init_db.py` — importa o modelo `User`.
- `api/routes/documents.py` — protege e filtra por usuário.
- `api/routes/stats.py` — filtra por usuário.
- `config.py` — `secret_key`, `access_token_expire_days`.
- `main.py` — registra o router de auth.
- `requirements.txt` — PyJWT, bcrypt, email-validator.
- `tests/conftest.py` — fixture `auth_client`.
- `tests/test_routes.py` — usa auth; testa isolamento.
- `tests/test_auth.py` (novo) — register/login/me.

**Frontend — novos:**
- `src/context/AuthContext.tsx` — estado de auth.
- `src/components/ProtectedRoute.tsx` — guarda de rota.
- `src/pages/Login.tsx`, `src/pages/Register.tsx`.

**Frontend — alterados:**
- `src/services/api.ts` — interceptor, funções de auth, blob helpers.
- `src/App.tsx` — rotas públicas/protegidas.
- `src/main.tsx` — envolve com `AuthProvider`.
- `src/components/Layout.tsx` — email do usuário + botão Sair.
- `src/pages/DocumentDetail.tsx` — preview e download via blob.

**Infra/docs:** `render.yaml`, `backend/.env.example`, `README.md`.

> **Nota de implementação:** o spec mencionava `passlib[bcrypt]`. Este plano usa a lib `bcrypt` diretamente — evita o warning conhecido de incompatibilidade entre passlib e bcrypt 4.x e reduz dependências. Comportamento idêntico (hash bcrypt).

---

## Task 1: Dependências e configuração

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/config.py`

- [ ] **Step 1: Adicionar dependências**

Em `backend/requirements.txt`, acrescentar ao final:

```
pyjwt==2.10.1
bcrypt==4.2.1
email-validator==2.2.0
```

- [ ] **Step 2: Instalar**

Run: `cd backend && pip install -r requirements.txt`
Expected: instala pyjwt, bcrypt e email-validator sem erro.

- [ ] **Step 3: Adicionar settings de auth**

Em `backend/config.py`, dentro da classe `Settings`, após o bloco de IA, adicionar:

```python
    # Autenticação (JWT). Em produção, defina SECRET_KEY com um valor aleatório.
    secret_key: str = "dev-insecure-secret-change-me"
    access_token_expire_days: int = 7
```

- [ ] **Step 4: Commit**

```bash
git add backend/requirements.txt backend/config.py
git commit -m "chore: adicionar deps e config de autenticacao (JWT)"
```

---

## Task 2: Serviço de autenticação (`services/auth.py`)

**Files:**
- Create: `backend/services/auth.py`
- Test: `backend/tests/test_auth_service.py`

- [ ] **Step 1: Escrever o teste que falha**

Criar `backend/tests/test_auth_service.py`:

```python
"""Testes unitários do serviço de autenticação."""
import pytest

from services import auth


def test_hash_e_verificacao_de_senha():
    h = auth.hash_password("senha123")
    assert h != "senha123"
    assert auth.verify_password("senha123", h) is True
    assert auth.verify_password("errada", h) is False


def test_token_round_trip():
    token = auth.create_access_token(user_id=42)
    assert auth.decode_token(token) == 42


def test_token_invalido_retorna_none():
    assert auth.decode_token("nao-e-um-token") is None
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && python -m pytest tests/test_auth_service.py -v`
Expected: FAIL com `ModuleNotFoundError` / `AttributeError` (auth não tem essas funções).

- [ ] **Step 3: Implementar o serviço**

Criar `backend/services/auth.py`:

```python
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd backend && python -m pytest tests/test_auth_service.py -v`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/services/auth.py backend/tests/test_auth_service.py
git commit -m "feat: servico de auth (hash bcrypt + JWT)"
```

---

## Task 3: Modelo `User` e schemas

**Files:**
- Create: `backend/models/user.py`
- Create: `backend/schemas/user.py`
- Modify: `backend/database/init_db.py`

- [ ] **Step 1: Criar o modelo `User`**

Criar `backend/models/user.py`:

```python
"""Modelo de dados do usuário."""
from datetime import UTC, datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database.session import Base


def _agora() -> datetime:
    """Horário atual em UTC (timezone-aware)."""
    return datetime.now(UTC)


class User(Base):
    """Conta de usuário com email único e senha hasheada."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_agora
    )
```

- [ ] **Step 2: Criar os schemas**

Criar `backend/schemas/user.py`:

```python
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
```

- [ ] **Step 3: Registrar o modelo no init_db**

Em `backend/database/init_db.py`, adicionar o import do `User` junto ao do `Document`:

```python
"""Inicialização do schema do banco de dados."""
from database.session import Base, engine

# Importa os modelos para que sejam registrados na metadata do Base.
from models.document import Document  # noqa: F401
from models.user import User  # noqa: F401


def init_db() -> None:
    """Cria todas as tabelas, se ainda não existirem."""
    Base.metadata.create_all(bind=engine)
```

- [ ] **Step 4: Verificar que importa sem erro**

Run: `cd backend && python -c "from database.init_db import init_db; from models.user import User; from schemas.user import Token; print('ok')"`
Expected: imprime `ok`.

- [ ] **Step 5: Commit**

```bash
git add backend/models/user.py backend/schemas/user.py backend/database/init_db.py
git commit -m "feat: modelo User e schemas de auth"
```

---

## Task 4: Dependency `get_current_user`

**Files:**
- Create: `backend/api/deps.py`

- [ ] **Step 1: Implementar a dependency**

Criar `backend/api/deps.py`:

```python
"""Dependencies compartilhadas das rotas (autenticação)."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database.session import get_db
from models.user import User
from services.auth import decode_token

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Resolve o usuário a partir do header `Authorization: Bearer <token>`."""
    erro = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não autenticado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if cred is None:
        raise erro
    user_id = decode_token(cred.credentials)
    if user_id is None:
        raise erro
    user = db.get(User, user_id)
    if user is None:
        raise erro
    return user
```

- [ ] **Step 2: Verificar import**

Run: `cd backend && python -c "from api.deps import get_current_user; print('ok')"`
Expected: imprime `ok`.

- [ ] **Step 3: Commit**

```bash
git add backend/api/deps.py
git commit -m "feat: dependency get_current_user"
```

---

## Task 5: Rotas de autenticação (`/api/auth`)

**Files:**
- Create: `backend/api/routes/auth.py`
- Modify: `backend/main.py`
- Test: `backend/tests/test_auth.py`

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/test_auth.py`:

```python
"""Testes das rotas de autenticação."""


def _registrar(client, email="a@a.com", senha="senha123"):
    return client.post(
        "/api/auth/register", json={"email": email, "password": senha}
    )


def test_register_sucesso(client):
    r = _registrar(client)
    assert r.status_code == 201
    body = r.json()
    assert body["access_token"]
    assert body["user"]["email"] == "a@a.com"
    assert "hashed_password" not in body["user"]


def test_register_email_duplicado(client):
    _registrar(client)
    r = _registrar(client)
    assert r.status_code == 409


def test_register_email_invalido(client):
    r = client.post(
        "/api/auth/register", json={"email": "nao-email", "password": "x"}
    )
    assert r.status_code == 422


def test_login_sucesso(client):
    _registrar(client)
    r = client.post(
        "/api/auth/login", json={"email": "a@a.com", "password": "senha123"}
    )
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_login_senha_errada(client):
    _registrar(client)
    r = client.post(
        "/api/auth/login", json={"email": "a@a.com", "password": "errada"}
    )
    assert r.status_code == 401


def test_login_usuario_inexistente(client):
    r = client.post(
        "/api/auth/login", json={"email": "ninguem@a.com", "password": "x"}
    )
    assert r.status_code == 401


def test_me_retorna_usuario(client):
    token = _registrar(client).json()["access_token"]
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "a@a.com"


def test_me_sem_token(client):
    assert client.get("/api/auth/me").status_code == 401
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend && python -m pytest tests/test_auth.py -v`
Expected: FAIL (rotas `/api/auth/*` inexistentes → 404).

- [ ] **Step 3: Implementar as rotas**

Criar `backend/api/routes/auth.py`:

```python
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
```

- [ ] **Step 4: Registrar o router**

Em `backend/main.py`, atualizar o import e o registro:

```python
from api.routes import auth, documents, stats
```

e, junto aos outros `include_router`:

```python
app.include_router(auth.router)
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend && python -m pytest tests/test_auth.py -v`
Expected: 8 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/api/routes/auth.py backend/main.py backend/tests/test_auth.py
git commit -m "feat: rotas de autenticacao (register/login/me)"
```

---

## Task 6: Vincular documentos ao usuário e proteger as rotas

**Files:**
- Modify: `backend/models/document.py`
- Modify: `backend/api/routes/documents.py`
- Modify: `backend/tests/conftest.py`
- Modify: `backend/tests/test_routes.py`

- [ ] **Step 1: Adicionar `user_id` ao modelo**

Em `backend/models/document.py`, adicionar os imports e a coluna. O arquivo de imports passa a ser:

```python
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
```

e, dentro de `Document`, logo após `id`:

```python
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )
```

- [ ] **Step 2: Adicionar fixture `auth_client` ao conftest**

Em `backend/tests/conftest.py`, após o `yield c` do fixture `client` (ainda dentro do arquivo, como novo fixture), adicionar:

```python
@pytest.fixture()
def auth_client(client):
    """Cliente já autenticado: registra um usuário e fixa o header Bearer."""
    token = client.post(
        "/api/auth/register",
        json={"email": "user@test.com", "password": "senha123"},
    ).json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client
```

- [ ] **Step 3: Proteger e filtrar as rotas de documentos**

Reescrever `backend/api/routes/documents.py` para exigir usuário e filtrar por dono. Versão completa:

```python
"""Rotas REST para upload e consulta de documentos."""
import json
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy import desc
from sqlalchemy.orm import Session

from api.deps import get_current_user
from config import settings
from database.session import get_db
from models.document import Document
from models.user import User
from schemas.document import AnalysisResult, DocumentDetail, DocumentRead
from services.pipeline import process_document

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Mapeia extensão → mime type usado na extração.
_MIME = {
    "pdf": "application/pdf",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
}


def _to_detail(doc: Document) -> DocumentDetail:
    """Monta o DocumentDetail incluindo a análise desserializada."""
    analysis = None
    if doc.analysis_json:
        analysis = AnalysisResult(**json.loads(doc.analysis_json))
    base = DocumentRead.model_validate(doc).model_dump()
    return DocumentDetail(**base, analysis=analysis)


def _get_owned(db: Session, doc_id: int, user: User) -> Document:
    """Busca um documento garantindo que pertence ao usuário (senão 404)."""
    doc = db.get(Document, doc_id)
    if not doc or doc.user_id != user.id:
        raise HTTPException(404, "Documento não encontrado.")
    return doc


@router.post("", response_model=DocumentDetail)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentDetail:
    """Recebe um arquivo, salva, processa e retorna o resultado."""
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(400, f"Extensão não suportada: .{ext}")

    conteudo = await file.read()
    if len(conteudo) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(
            400, f"Arquivo excede o tamanho máximo ({settings.max_file_size_mb} MB)."
        )

    os.makedirs(settings.upload_dir, exist_ok=True)
    nome_unico = f"{uuid.uuid4().hex}.{ext}"
    caminho = os.path.join(settings.upload_dir, nome_unico)
    with open(caminho, "wb") as f:
        f.write(conteudo)

    doc = Document(
        filename=file.filename,
        file_path=caminho,
        mime_type=_MIME[ext],
        status="processing",
        user_id=user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    process_document(db, doc)
    return _to_detail(doc)


@router.get("", response_model=list[DocumentRead])
def listar_documentos(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Document]:
    """Lista os documentos do usuário, do mais recente para o mais antigo."""
    return (
        db.query(Document)
        .filter(Document.user_id == user.id)
        .order_by(desc(Document.created_at))
        .all()
    )


@router.get("/{doc_id}", response_model=DocumentDetail)
def detalhe_documento(
    doc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentDetail:
    """Retorna os detalhes completos de um documento do usuário."""
    return _to_detail(_get_owned(db, doc_id, user))


@router.get("/{doc_id}/download")
def download_resultado(
    doc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    """Baixa o resultado da análise como arquivo JSON."""
    doc = _get_owned(db, doc_id, user)
    if not doc.analysis_json:
        raise HTTPException(404, "Análise não encontrada.")
    return Response(
        content=doc.analysis_json,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="analise_{doc_id}.json"'
        },
    )


@router.get("/{doc_id}/file")
def arquivo_original(
    doc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    """Serve o arquivo original (para o visualizador no frontend)."""
    doc = _get_owned(db, doc_id, user)
    if not os.path.exists(doc.file_path):
        raise HTTPException(404, "Arquivo não encontrado.")
    return FileResponse(doc.file_path, media_type=doc.mime_type, filename=doc.filename)
```

- [ ] **Step 4: Atualizar os testes de rotas (auth + isolamento)**

Reescrever `backend/tests/test_routes.py`:

```python
"""Testes de integração das rotas de documentos."""
import fitz


def _pdf_bytes() -> bytes:
    doc = fitz.open()
    pagina = doc.new_page()
    pagina.insert_text((72, 72), "Joao Silva joao@email.com Curriculo")
    conteudo = doc.tobytes()
    doc.close()
    return conteudo


def _upload(client) -> int:
    r = client.post(
        "/api/documents",
        files={"file": ("cv.pdf", _pdf_bytes(), "application/pdf")},
    )
    assert r.status_code == 200
    return r.json()["id"]


def test_upload_e_detalhe(auth_client):
    doc_id = _upload(auth_client)

    detalhe = auth_client.get(f"/api/documents/{doc_id}")
    assert detalhe.status_code == 200
    assert detalhe.json()["analysis"]["tipo"]

    assert auth_client.get("/api/documents").status_code == 200

    download = auth_client.get(f"/api/documents/{doc_id}/download")
    assert download.status_code == 200
    assert "tipo" in download.json()

    stats = auth_client.get("/api/stats").json()
    assert stats["total"] >= 1


def test_extensao_invalida(auth_client):
    r = auth_client.post(
        "/api/documents",
        files={"file": ("x.txt", b"oi", "text/plain")},
    )
    assert r.status_code == 400


def test_documento_inexistente(auth_client):
    assert auth_client.get("/api/documents/9999").status_code == 404


def test_sem_token_bloqueia(client):
    assert client.get("/api/documents").status_code == 401
    assert client.post("/api/documents").status_code == 401


def test_isolamento_entre_usuarios(client):
    # Usuário A registra e envia um documento.
    token_a = client.post(
        "/api/auth/register",
        json={"email": "a@test.com", "password": "senha123"},
    ).json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token_a}"})
    doc_id = _upload(client)

    # Usuário B não enxerga o documento de A.
    token_b = client.post(
        "/api/auth/register",
        json={"email": "b@test.com", "password": "senha123"},
    ).json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token_b}"})

    assert client.get("/api/documents").json() == []
    assert client.get(f"/api/documents/{doc_id}").status_code == 404
    assert client.get(f"/api/documents/{doc_id}/file").status_code == 404
    assert client.get(f"/api/documents/{doc_id}/download").status_code == 404
```

- [ ] **Step 5: Rodar a suíte de documentos**

Run: `cd backend && python -m pytest tests/test_routes.py -v`
Expected: todos passam (incl. `test_isolamento_entre_usuarios`).

- [ ] **Step 6: Commit**

```bash
git add backend/models/document.py backend/api/routes/documents.py backend/tests/conftest.py backend/tests/test_routes.py
git commit -m "feat: vincular documentos ao usuario e isolar por dono"
```

---

## Task 7: Filtrar estatísticas por usuário

**Files:**
- Modify: `backend/api/routes/stats.py`
- Test: cobre via `test_routes.py` (Task 6) + verificação abaixo

- [ ] **Step 1: Proteger e filtrar a rota de stats**

Reescrever `backend/api/routes/stats.py`:

```python
"""Rota de estatísticas para o dashboard."""
from fastapi import APIRouter, Depends
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from api.deps import get_current_user
from database.session import get_db
from models.document import Document
from models.user import User
from schemas.document import StatsResponse, TipoContagem

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
def obter_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> StatsResponse:
    """Retorna total, contagem por tipo e os últimos uploads do usuário."""
    base = db.query(Document).filter(Document.user_id == user.id)
    total = base.count()

    por_tipo = [
        TipoContagem(tipo=tipo or "Desconhecido", total=qtd)
        for tipo, qtd in (
            db.query(Document.doc_type, func.count(Document.id))
            .filter(Document.user_id == user.id)
            .group_by(Document.doc_type)
            .all()
        )
    ]

    ultimos = base.order_by(desc(Document.created_at)).limit(5).all()

    return StatsResponse(total=total, por_tipo=por_tipo, ultimos=ultimos)
```

- [ ] **Step 2: Rodar a suíte completa do backend**

Run: `cd backend && python -m pytest -v`
Expected: todos os testes passam (auth, auth_service, routes, extraction, analyzer_mock).

- [ ] **Step 3: Commit**

```bash
git add backend/api/routes/stats.py
git commit -m "feat: filtrar estatisticas por usuario"
```

---

## Task 8: Frontend — camada de API (interceptor, auth, blobs)

**Files:**
- Modify: `frontend/src/services/api.ts`

- [ ] **Step 1: Adicionar tipos, interceptor, funções de auth e blob helpers**

Reescrever `frontend/src/services/api.ts`. Manter o que já existe e acrescentar. Versão completa:

```typescript
import axios from "axios";

// Em produção (Vercel) defina VITE_API_URL com a URL do backend no Render
// (ex.: https://docmind-api.onrender.com). Em desenvolvimento, fica vazio e o
// Vite faz proxy de /api para o backend local.
const API_ROOT = import.meta.env.VITE_API_URL ?? "";

const TOKEN_KEY = "docmind_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Cliente Axios apontando para a API do backend.
const api = axios.create({ baseURL: `${API_ROOT}/api` });

// Anexa o token Bearer em toda request, se houver.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 → sessão expirou/inválida: limpa o token e manda para o login.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      tokenStore.clear();
      if (!location.pathname.startsWith("/login")) {
        location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export interface AnalysisResult {
  tipo: string;
  resumo: string;
  informacoes: Record<string, unknown>;
}

export interface DocumentRead {
  id: number;
  filename: string;
  mime_type: string;
  doc_type: string | null;
  summary: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

export interface DocumentDetail extends DocumentRead {
  analysis: AnalysisResult | null;
}

export interface TipoContagem {
  tipo: string;
  total: number;
}

export interface Stats {
  total: number;
  por_tipo: TipoContagem[];
  ultimos: DocumentRead[];
}

export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function register(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/register", {
    email,
    password,
  });
  return data;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export async function uploadDocument(file: File): Promise<DocumentDetail> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<DocumentDetail>("/documents", form);
  return data;
}

export async function getDocuments(): Promise<DocumentRead[]> {
  const { data } = await api.get<DocumentRead[]>("/documents");
  return data;
}

export async function getDocument(id: number): Promise<DocumentDetail> {
  const { data } = await api.get<DocumentDetail>(`/documents/${id}`);
  return data;
}

export async function getStats(): Promise<Stats> {
  const { data } = await api.get<Stats>("/stats");
  return data;
}

// Baixa o arquivo original (autenticado) como object URL para o visualizador.
export async function fetchFileObjectUrl(id: number): Promise<string> {
  const { data } = await api.get(`/documents/${id}/file`, {
    responseType: "blob",
  });
  return URL.createObjectURL(data);
}

// Baixa o JSON da análise (autenticado) e dispara o download no navegador.
export async function downloadAnalysis(
  id: number,
  filename = `analise_${id}.json`,
): Promise<void> {
  const { data } = await api.get(`/documents/${id}/download`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default api;
```

> **Removidos:** `downloadUrl` e `fileUrl` (URLs diretas sem auth). Substituídos por `downloadAnalysis` e `fetchFileObjectUrl`. A Task 11 atualiza o único consumidor (`DocumentDetail`).

- [ ] **Step 2: Verificar build de tipos**

Run: `cd frontend && npx tsc -b`
Expected: erros apenas em `DocumentDetail.tsx` (ainda usa `downloadUrl`/`fileUrl`) — serão corrigidos na Task 11. Nenhum erro em `api.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: interceptor de auth, funcoes de login e blobs autenticados"
```

---

## Task 9: Frontend — AuthContext e provider

**Files:**
- Create: `frontend/src/context/AuthContext.tsx`
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Criar o contexto de autenticação**

Criar `frontend/src/context/AuthContext.tsx`:

```typescript
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getMe,
  login as apiLogin,
  register as apiRegister,
  tokenStore,
  type User,
} from "../services/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Na carga inicial, se houver token, recupera o usuário.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    getMe()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await apiLogin(email, password);
    tokenStore.set(res.access_token);
    setUser(res.user);
  }

  async function register(email: string, password: string) {
    const res = await apiRegister(email, password);
    tokenStore.set(res.access_token);
    setUser(res.user);
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Envolver a aplicação com o provider**

Em `frontend/src/main.tsx`, importar e envolver `<App />`:

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";
// Design system: tokens first, then components (override Tailwind utilities).
import "./styles/tokens.css";
import "./styles/ui.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/AuthContext.tsx frontend/src/main.tsx
git commit -m "feat: AuthContext e provider"
```

---

## Task 10: Frontend — páginas de login/cadastro e rotas protegidas

**Files:**
- Create: `frontend/src/pages/Login.tsx`
- Create: `frontend/src/pages/Register.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/Layout.tsx`

- [ ] **Step 1: Criar o guard de rota**

Criar `frontend/src/components/ProtectedRoute.tsx`:

```typescript
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

/** Bloqueia rotas internas: sem usuário → redireciona para /login. */
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loader label="Carregando…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

- [ ] **Step 2: Criar a página de Login**

Criar `frontend/src/pages/Login.tsx`:

```typescript
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(email, senha);
      navigate("/");
    } catch {
      setErro("Email ou senha inválidos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h3>Entrar no DocMind</h3>
        {erro && <p className="alert">{erro}</p>}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>
        <button className="btn btn-primary" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
        <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
          Não tem conta? <Link to="/register" className="link">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Criar a página de Cadastro**

Criar `frontend/src/pages/Register.tsx`:

```typescript
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await register(email, senha);
      navigate("/");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setErro("Esse email já está cadastrado.");
      } else {
        setErro("Não foi possível criar a conta. Verifique os dados.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h3>Criar conta</h3>
        {erro && <p className="alert">{erro}</p>}
        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={6}
            required
          />
        </label>
        <button className="btn btn-primary" disabled={enviando}>
          {enviando ? "Criando…" : "Criar conta"}
        </button>
        <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
          Já tem conta? <Link to="/login" className="link">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Atualizar o roteamento**

Reescrever `frontend/src/App.tsx`:

```typescript
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import History from "./pages/History";
import DocumentDetail from "./pages/DocumentDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<Upload />} />
          <Route path="history" element={<History />} />
          <Route path="documents/:id" element={<DocumentDetail />} />
        </Route>
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 5: Mostrar usuário + Sair no Layout**

Em `frontend/src/components/Layout.tsx`, importar o hook no topo:

```typescript
import { useAuth } from "../context/AuthContext";
```

Dentro do componente `Layout`, após `const navigate = useNavigate();`, adicionar:

```typescript
  const { user, logout } = useAuth();

  function sair() {
    logout();
    navigate("/login");
  }
```

E substituir o bloco `<div className="bottom">…</div>` da sidebar por:

```tsx
        <div className="bottom">
          <div className="user">
            <span className="av">
              {(user?.email?.[0] ?? "U").toUpperCase()}
            </span>
            <span className="who">
              <b>{user?.email ?? "Usuário"}</b>
              <small>Conta DocMind</small>
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "var(--space-3)", width: "100%" }}
            onClick={sair}
          >
            <Icon name="arrow-left" size={14} />
            Sair
          </button>
        </div>
```

- [ ] **Step 6: Estilos das telas de auth**

Em `frontend/src/styles/ui.css`, acrescentar ao final:

```css
/* Telas de autenticação */
.auth-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-6);
}
.auth-card {
  width: 100%;
  max-width: 380px;
  padding: var(--space-6);
  display: grid;
  gap: var(--space-4);
}
.field {
  display: grid;
  gap: 6px;
  font-size: var(--text-sm);
}
.field input {
  height: 38px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: inherit;
}
```

> Se algum dos tokens CSS acima (`--border`, `--surface`, `--radius-md`) não existir, usar o equivalente já presente em `tokens.css`. Confirmar abrindo o arquivo antes.

- [ ] **Step 7: Verificar build**

Run: `cd frontend && npx tsc -b`
Expected: PASS (sem erros). `DocumentDetail.tsx` ainda referencia `fileUrl`/`downloadUrl` → será corrigido na próxima task; se acusar erro nele, prosseguir para a Task 11 e revalidar lá.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Login.tsx frontend/src/pages/Register.tsx frontend/src/components/ProtectedRoute.tsx frontend/src/App.tsx frontend/src/components/Layout.tsx frontend/src/styles/ui.css
git commit -m "feat: telas de login/cadastro, rotas protegidas e logout"
```

---

## Task 11: Frontend — preview e download autenticados

**Files:**
- Modify: `frontend/src/pages/DocumentDetail.tsx`

- [ ] **Step 1: Carregar o arquivo como blob e baixar via Axios**

Reescrever `frontend/src/pages/DocumentDetail.tsx`:

```typescript
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import FilePreview from "../components/FilePreview";
import JsonViewer from "../components/JsonViewer";
import Loader from "../components/Loader";
import { Icon } from "../components/Icon";
import {
  downloadAnalysis,
  fetchFileObjectUrl,
  getDocument,
  type DocumentDetail as Detail,
} from "../services/api";

/** Página de detalhes: visualizador do arquivo + resultado da análise. */
export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Detail | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getDocument(Number(id))
      .then(setDoc)
      .catch(() => setErro("Documento não encontrado."))
      .finally(() => setLoading(false));
  }, [id]);

  // Carrega o arquivo original (autenticado) como object URL e revoga ao sair.
  useEffect(() => {
    if (!id) return;
    let url: string | null = null;
    fetchFileObjectUrl(Number(id))
      .then((u) => {
        url = u;
        setFileUrl(u);
      })
      .catch(() => setFileUrl(null));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  if (loading) return <Loader label="Carregando documento…" />;
  if (erro || !doc) return <p className="alert">{erro ?? "Erro."}</p>;

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/history" className="link">
            <Icon name="arrow-left" size={14} />
            Voltar ao histórico
          </Link>
          <h3 style={{ marginTop: 4 }}>{doc.filename}</h3>
        </div>
        {doc.analysis && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => downloadAnalysis(doc.id, `analise_${doc.id}.json`)}
          >
            <Icon name="download" />
            Baixar JSON
          </button>
        )}
      </div>

      {doc.status === "error" && (
        <p className="alert mt-4" style={{ marginBottom: "var(--space-6)" }}>
          Erro no processamento: {doc.error}
        </p>
      )}

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-head">
            <h4>Visualização</h4>
          </div>
          <div className="card-body">
            {fileUrl ? (
              <FilePreview url={fileUrl} mimeType={doc.mime_type} />
            ) : (
              <Loader label="Carregando arquivo…" />
            )}
          </div>
        </div>

        <div className="grid" style={{ gap: "var(--space-4)" }}>
          {doc.analysis && (
            <div className="card">
              <div className="card-body">
                <span className="badge badge-accent">{doc.analysis.tipo}</span>
                <h4
                  style={{
                    margin: "var(--space-4) 0 4px",
                    fontSize: "var(--text-base)",
                  }}
                >
                  Resumo
                </h4>
                <p
                  className="muted"
                  style={{ margin: 0, fontSize: "var(--text-sm)" }}
                >
                  {doc.analysis.resumo}
                </p>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <h4>Resultado da extração</h4>
            </div>
            <div className="card-body">
              <JsonViewer data={doc.analysis ?? { status: doc.status }} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Build de tipos limpo**

Run: `cd frontend && npx tsc -b`
Expected: PASS, sem erros em nenhum arquivo.

- [ ] **Step 3: Build de produção**

Run: `cd frontend && npm run build`
Expected: build conclui sem erro.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/DocumentDetail.tsx
git commit -m "feat: preview e download de arquivos autenticados via blob"
```

---

## Task 12: Infra e documentação

**Files:**
- Modify: `render.yaml`
- Modify: `backend/.env.example`
- Modify: `README.md`

- [ ] **Step 1: Adicionar SECRET_KEY ao render.yaml**

Em `render.yaml`, dentro de `envVars` do serviço `docmind-api`, após o bloco de
`FRONTEND_ORIGIN` (linhas 29-31), acrescentar:

```yaml
      # Chave para assinar tokens JWT (gerada e mantida pelo Render).
      - key: SECRET_KEY
        generateValue: true
```

- [ ] **Step 2: Documentar a variável no .env.example**

Em `backend/.env.example`, acrescentar ao final (o arquivo hoje tem só
`OPENAI_API_KEY` e `OPENAI_MODEL`):

```
# Chave para assinar os tokens JWT. Em produção, use um valor aleatório e secreto.
SECRET_KEY=dev-insecure-secret-change-me
```

- [ ] **Step 3: Atualizar o README**

Em `README.md`:

1. Na tabela de **Referência da API**, adicionar as rotas de auth no topo:

```markdown
| `POST` | `/api/auth/register` | Cria conta (email + senha) |
| `POST` | `/api/auth/login` | Autentica e retorna um token JWT |
| `GET` | `/api/auth/me` | Retorna o usuário autenticado |
```

2. Adicionar nota de que **as rotas de documentos e estatísticas exigem
   autenticação** (header `Authorization: Bearer <token>`), e que cada usuário só
   acessa os próprios documentos.

3. Na tabela de **Variáveis de ambiente → Backend**, adicionar:

```markdown
| `SECRET_KEY` | `dev-insecure-...` | Chave para assinar os tokens JWT (defina em produção) |
```

4. Na lista de **Funcionalidades**, acrescentar:

```markdown
| 🔐 | **Contas de usuário** | Cadastro/login com JWT; cada usuário vê só os próprios documentos |
```

- [ ] **Step 4: Commit**

```bash
git add render.yaml backend/.env.example README.md
git commit -m "docs: documentar autenticacao e SECRET_KEY"
```

---

## Task 13: Verificação ponta a ponta

**Files:** nenhuma alteração — verificação manual.

- [ ] **Step 1: Backend completo verde**

Run: `cd backend && python -m pytest -v`
Expected: todos os testes passam.

- [ ] **Step 2: Apagar o banco local (começar limpo)**

O schema mudou (nova tabela `users`, `documents.user_id` não-nulo). Remover o
SQLite local para o `init_db` recriar tudo:

Run (PowerShell): `Remove-Item backend/docmind.db -ErrorAction SilentlyContinue`
Expected: arquivo removido (ou já inexistente).

> Em produção (Render/Postgres), o banco também deve ser zerado/recriado, conforme
> a decisão "apagar tudo e começar limpo" do spec.

- [ ] **Step 3: Subir backend + frontend e testar o fluxo**

Run (dois terminais):
- `cd backend && uvicorn main:app --reload`
- `cd frontend && npm run dev`

Verificar manualmente:
1. Acessar `/` sem login → redireciona para `/login`.
2. Cadastrar uma conta nova → entra e cai no Dashboard.
3. Fazer upload de um PDF → aparece no histórico e abre o detalhe (preview do PDF carrega).
4. Baixar o JSON da análise → download funciona.
5. Sair (logout) → volta ao login; acessar `/` de novo redireciona ao login.
6. Cadastrar uma **segunda** conta → Dashboard zerado; histórico não mostra os documentos da primeira conta.

- [ ] **Step 4: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "chore: verificacao e ajustes finais do perfil de usuario"
```

---

## Resumo da cobertura (spec → tasks)

- Modelo `User` + `Document.user_id` → Tasks 3, 6.
- Serviço JWT + bcrypt → Task 2.
- `get_current_user` → Task 4.
- Rotas register/login/me → Task 5.
- Isolamento de documentos → Task 6.
- Isolamento de stats → Task 7.
- Frontend: token/interceptor/blobs → Task 8.
- AuthContext → Task 9.
- Login/Register/rotas protegidas/logout → Task 10.
- Preview/download autenticados → Task 11.
- SECRET_KEY + docs → Task 12.
- Verificação E2E e banco limpo → Task 13.
- Erros (401/409/422, mensagens genéricas) → Tasks 4, 5, 10.
- Testes (auth, isolamento) → Tasks 2, 5, 6.
