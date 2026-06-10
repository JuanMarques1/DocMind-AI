# Design — Sistema de perfil de usuário (autenticação)

**Data:** 2026-06-09
**Projeto:** DocMind AI
**Status:** Aprovado (aguardando revisão do spec)

## Problema

A versão em produção não tem conceito de usuário. O modelo `Document` não tem
dono e todas as consultas (`GET /api/documents`, `/api/stats`) retornam todos os
documentos do banco, sem filtro. Resultado: todo mundo que acessa o deploy vê o
histórico de todo mundo — "mistura tudo o que manda".

## Objetivo

Cada usuário cria uma conta (email + senha), faz login, e passa a ver e operar
**apenas** os próprios documentos. Isolamento completo por usuário.

## Decisões (tomadas no brainstorming)

| Decisão | Escolha |
|---------|---------|
| Nível de identidade | Login com senha (autenticação real, JWT) |
| Identificador | Email + senha |
| Dados antigos em produção | Apagar tudo e começar limpo |

## Fora de escopo (YAGNI)

Recuperação de senha, verificação de email, refresh tokens, papel de admin.
Login simples com JWT resolve o problema atual. Estas features podem vir depois.

---

## Arquitetura

```
┌──────────────┐   Authorization: Bearer <JWT>   ┌─────────────────────────┐
│   Frontend   │ ──────────────────────────────► │         Backend         │
│ React + Vite │                                 │         FastAPI         │
│              │ ◄────────────────────────────── │                         │
│ AuthContext  │   { token } / 401               │  get_current_user dep   │
│ (localStorage)│                                │  filtra por user_id     │
└──────────────┘                                 └─────────────────────────┘
```

Token JWT (HS256) emitido no register/login, guardado no `localStorage`, anexado
a toda request por um interceptor do Axios. O backend valida o token numa
dependency `get_current_user` e filtra todas as queries pelo usuário dono.

---

## Backend

### Modelo de dados

**Novo: `models/user.py`**

```python
class User(Base):
    __tablename__ = "users"
    id: int (PK)
    email: str  # único, indexado
    hashed_password: str
    created_at: datetime  # UTC, default now
```

**Alterado: `models/document.py`**

- Adicionar `user_id: int` — FK `users.id`, **não-nulo**, indexado.
- (Opcional) relationship `owner`.

Como o banco será zerado, `init_db()` (`create_all`) recria as tabelas com o
schema novo. Sem Alembic, sem migração manual.

### Serviço de autenticação — `services/auth.py`

- `hash_password(senha) -> str` e `verify_password(senha, hash) -> bool` via
  `passlib[bcrypt]`.
- `create_access_token(user_id) -> str` — JWT HS256 (PyJWT), assinado com
  `SECRET_KEY`, claim `sub=user_id` e `exp` (~7 dias).
- `decode_token(token) -> user_id` — valida assinatura e expiração; erro → `None`.

### Dependency — `get_current_user`

- Lê `Authorization: Bearer <token>` (via `OAuth2PasswordBearer` ou
  `HTTPBearer`).
- Decodifica, busca o `User` no banco. Token ausente/inválido/usuário inexistente
  → `HTTPException 401`.
- Retorna o `User` para injeção nas rotas.

### Rotas de auth — `api/routes/auth.py` (prefixo `/api/auth`)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/auth/register` | Cria conta (email+senha). Email duplicado → `409`. Retorna `{ access_token, token_type, user }`. |
| `POST` | `/api/auth/login` | Valida credenciais. Falha → `401` com mensagem genérica. Retorna `{ access_token, token_type, user }`. |
| `GET` | `/api/auth/me` | Retorna o usuário do token (requer auth). |

### Isolamento nas rotas existentes

Todas passam a depender de `get_current_user`:

- `POST /api/documents` → grava `user_id = current_user.id`.
- `GET /api/documents` → `.filter(Document.user_id == current_user.id)`.
- `GET /api/documents/{id}`, `/{id}/file`, `/{id}/download` → buscam por id **e**
  validam `doc.user_id == current_user.id`; caso contrário `404` (não vaza
  existência de documentos de outros).
- `GET /api/stats` → `total`, `por_tipo` e `ultimos` filtrados por `user_id`.

### Schemas — `schemas/`

- `UserCreate` (`email: EmailStr`, `password: str`), `UserRead`
  (`id`, `email`, `created_at` — nunca expõe hash), `Token`
  (`access_token`, `token_type`, `user: UserRead`), `LoginRequest`.

### Config — `config.py`

- Nova var `secret_key: str` (de env `SECRET_KEY`). Default só para dev; em
  produção deve ser definida. Documentar no README e no `render.yaml`.
- `access_token_expire_days: int = 7` (configurável).

---

## Frontend

### Estado de auth

- **`AuthContext`** (`src/context/AuthContext.tsx`): mantém `token` e `user`,
  expõe `login()`, `register()`, `logout()`. Persiste token no `localStorage`.
- **Interceptor Axios** (`services/api.ts`): anexa `Authorization: Bearer <token>`
  em toda request. Resposta `401` → limpa sessão e redireciona para `/login`.
- Novas funções de API: `register()`, `login()`, `getMe()`.

### Páginas e rotas

- **Novas páginas**: `Login` e `Register` (`src/pages/`).
- **Rotas protegidas** (`App.tsx`): wrapper que redireciona para `/login` se não
  houver token. `/login` e `/register` ficam fora do layout protegido.
- **Layout** (`components/Layout.tsx`): mostrar email do usuário + botão **Sair**.

### Visualizador e download (ponto de atenção)

Hoje `DocumentDetail` usa `fileUrl(id)` / `downloadUrl(id)` como URLs diretas —
essas requisições **não passam pelo interceptor** e ficariam sem token:

- **react-pdf**: passar o token via `httpHeaders` no objeto `file` do
  `<Document>`. Preview de imagem: carregar via fetch/blob autenticado.
- **Download JSON**: baixar via Axios (responseType blob) e disparar download no
  cliente, em vez de `<a href>` direto.

---

## Erros e validação

- Login inválido → `401` com mensagem genérica ("Email ou senha inválidos").
- Email duplicado no register → `409`.
- Email validado por `EmailStr` (pydantic) → `422` em formato inválido.
- Requests sem/with token inválido em rotas protegidas → `401`, frontend
  redireciona para login.

---

## Testes

- **Ajuste**: testes existentes de documentos/stats passam a criar um usuário e
  autenticar (helper que registra + retorna header com token).
- **Novos**:
  - register: sucesso, email duplicado (`409`), email inválido (`422`).
  - login: sucesso, senha errada (`401`), usuário inexistente (`401`).
  - rota protegida sem token → `401`.
  - **isolamento**: usuário A não vê/baixa/acessa documento do usuário B (`404`);
    `GET /api/documents` e `/api/stats` só retornam dados do próprio usuário.

---

## Arquivos afetados (resumo)

**Backend (novos):** `models/user.py`, `services/auth.py`, `api/routes/auth.py`,
schemas de user/token.
**Backend (alterados):** `models/document.py`, `api/routes/documents.py`,
`api/routes/stats.py`, `config.py`, `main.py` (registrar router auth),
`schemas/document.py`, `requirements.txt` (passlib[bcrypt], PyJWT,
email-validator), testes.
**Frontend (novos):** `context/AuthContext.tsx`, `pages/Login.tsx`,
`pages/Register.tsx`, componente de rota protegida.
**Frontend (alterados):** `App.tsx`, `services/api.ts`, `components/Layout.tsx`,
`pages/DocumentDetail.tsx`.
**Infra/docs:** `render.yaml` (SECRET_KEY), `README.md`, `.env.example`.
