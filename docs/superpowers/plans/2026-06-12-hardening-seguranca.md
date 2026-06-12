# Hardening de segurança — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Endurecer o backend com rate limiting nas rotas de auth, validação de conteúdo (magic bytes) nos uploads e headers de segurança em todas as respostas.

**Architecture:** Três unidades independentes: um `Limiter` (slowapi, storage em memória, IP real via `X-Forwarded-For`) aplicado por decorator nas rotas de auth; um helper puro de assinaturas chamado pela rota de upload; e um middleware ASGI que injeta headers fixos + HSTS condicional. Tudo configurável via `Settings`.

**Tech Stack:** FastAPI · slowapi 0.1.9 · Starlette middleware · pytest.

**Spec:** `docs/superpowers/specs/2026-06-12-hardening-seguranca-design.md`

---

## Estrutura de arquivos

**Novos:**
- `backend/rate_limit.py` — key function de IP + instância `limiter` (módulo próprio para evitar import circular entre `main` e `api/routes/auth`).
- `backend/middleware.py` — `SecurityHeadersMiddleware`.
- `backend/services/upload_validation.py` — `conteudo_corresponde(ext, conteudo)`.
- `backend/tests/test_security.py` — testes de headers, upload e rate limit.

**Alterados:**
- `backend/config.py` — settings de rate limit e HSTS.
- `backend/requirements.txt` — slowapi.
- `backend/main.py` — registra middleware, limiter e handler de 429.
- `backend/api/routes/auth.py` — decorators de limite + parâmetro `request`.
- `backend/api/routes/documents.py` — rejeita arquivo vazio e conteúdo que não bate com a extensão.
- `backend/tests/conftest.py` — desliga o rate limit por padrão nos testes.
- `render.yaml`, `backend/.env.example`, `README.md` — `HSTS_ENABLED` e docs.

---

## Task 1: Dependência e settings

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/config.py`

- [ ] **Step 1: Adicionar slowapi**

Em `backend/requirements.txt`, acrescentar ao final:

```
slowapi==0.1.9
```

- [ ] **Step 2: Instalar**

Run: `cd backend; pip install -r requirements.txt`
Expected: instala `slowapi` (e a dependência `limits`) sem erro.

- [ ] **Step 3: Adicionar settings**

Em `backend/config.py`, dentro da classe `Settings`, logo após o bloco de
Autenticação (`access_token_expire_days`), adicionar:

```python
    # Rate limiting por IP nas rotas de autenticação (formato do slowapi).
    rate_limit_enabled: bool = True
    rate_limit_login: str = "5/minute"
    rate_limit_register: str = "3/minute"

    # Envia Strict-Transport-Security. Ative apenas em produção (HTTPS).
    hsts_enabled: bool = False
```

- [ ] **Step 4: Verificar que carrega**

Run: `cd backend; python -c "from config import settings; print(settings.rate_limit_login, settings.hsts_enabled)"`
Expected: imprime `5/minute False`.

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/config.py
git commit -m "chore: dependencia slowapi e settings de hardening"
```

---

## Task 2: Headers de segurança (middleware)

**Files:**
- Create: `backend/middleware.py`
- Modify: `backend/main.py`
- Test: `backend/tests/test_security.py` (novo arquivo, primeiros testes)

- [ ] **Step 1: Escrever os testes que falham**

Criar `backend/tests/test_security.py`:

```python
"""Testes das medidas de hardening: headers, upload e rate limit."""
from config import settings


def test_headers_de_seguranca_presentes(client):
    r = client.get("/api/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"
    assert (
        r.headers["Content-Security-Policy"]
        == "default-src 'none'; frame-ancestors 'none'"
    )
    # HSTS desligado por padrão (dev local em HTTP).
    assert "Strict-Transport-Security" not in r.headers


def test_hsts_quando_habilitado(client, monkeypatch):
    monkeypatch.setattr(settings, "hsts_enabled", True)
    r = client.get("/api/health")
    assert "max-age=63072000" in r.headers["Strict-Transport-Security"]
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend; python -m pytest tests/test_security.py -v`
Expected: 2 FAILED (KeyError nos headers ausentes).

- [ ] **Step 3: Implementar o middleware**

Criar `backend/middleware.py`:

```python
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
```

- [ ] **Step 4: Registrar no app**

Em `backend/main.py`, adicionar o import (junto aos demais):

```python
from middleware import SecurityHeadersMiddleware
```

e, logo após o bloco do `app.add_middleware(CORSMiddleware, ...)`:

```python
app.add_middleware(SecurityHeadersMiddleware)
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd backend; python -m pytest tests/test_security.py -v`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/middleware.py backend/main.py backend/tests/test_security.py
git commit -m "feat: middleware de headers de seguranca (CSP, nosniff, HSTS)"
```

---

## Task 3: Validação de conteúdo no upload (magic bytes)

**Files:**
- Create: `backend/services/upload_validation.py`
- Modify: `backend/api/routes/documents.py`
- Test: `backend/tests/test_security.py` (acrescentar) e unit test do helper

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao final de `backend/tests/test_security.py`:

```python
def test_conteudo_corresponde_assinaturas():
    from services.upload_validation import conteudo_corresponde

    assert conteudo_corresponde("pdf", b"%PDF-1.7 resto") is True
    assert conteudo_corresponde("pdf", b"MZ\x90\x00") is False
    assert conteudo_corresponde("png", b"\x89PNG\r\n\x1a\n" + b"x") is True
    assert conteudo_corresponde("jpg", b"\xff\xd8\xff\xe0") is True
    assert conteudo_corresponde("jpeg", b"\xff\xd8\xff\xe1") is True
    assert conteudo_corresponde("exe", b"MZ") is False


def test_upload_conteudo_falso_rejeitado(auth_client):
    r = auth_client.post(
        "/api/documents",
        files={"file": ("x.pdf", b"isto e so texto puro", "application/pdf")},
    )
    assert r.status_code == 400


def test_upload_png_renomeado_para_pdf_rejeitado(auth_client):
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
    r = auth_client.post(
        "/api/documents",
        files={"file": ("x.pdf", png, "application/pdf")},
    )
    assert r.status_code == 400


def test_upload_arquivo_vazio_rejeitado(auth_client):
    r = auth_client.post(
        "/api/documents",
        files={"file": ("x.pdf", b"", "application/pdf")},
    )
    assert r.status_code == 400
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend; python -m pytest tests/test_security.py -v`
Expected: os 4 novos testes FALHAM (`ModuleNotFoundError` no unit test; uploads retornam 200).

- [ ] **Step 3: Implementar o helper**

Criar `backend/services/upload_validation.py`:

```python
"""Validação de conteúdo de uploads por assinatura (magic bytes)."""

# Assinaturas conhecidas por extensão suportada.
_ASSINATURAS: dict[str, list[bytes]] = {
    "pdf": [b"%PDF-"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
}


def conteudo_corresponde(ext: str, conteudo: bytes) -> bool:
    """True se o início do conteúdo bate com alguma assinatura da extensão."""
    assinaturas = _ASSINATURAS.get(ext)
    if not assinaturas:
        return False
    return any(conteudo.startswith(a) for a in assinaturas)
```

- [ ] **Step 4: Usar na rota de upload**

Em `backend/api/routes/documents.py`, adicionar o import (junto aos demais de
`services`):

```python
from services.upload_validation import conteudo_corresponde
```

e, dentro de `upload_document`, logo APÓS o bloco do limite de tamanho
(`if len(conteudo) > settings.max_file_size_mb ...: raise ...`) e ANTES do
`os.makedirs(...)`, inserir:

```python
    if not conteudo:
        raise HTTPException(400, "Arquivo vazio.")
    if not conteudo_corresponde(ext, conteudo):
        raise HTTPException(
            400, f"O conteúdo do arquivo não corresponde à extensão .{ext}."
        )
```

- [ ] **Step 5: Rodar e ver passar (incl. suíte de rotas)**

Run: `cd backend; python -m pytest tests/test_security.py tests/test_routes.py -v`
Expected: todos passam (os PDFs dos testes existentes são reais, começam com `%PDF-`).

- [ ] **Step 6: Commit**

```bash
git add backend/services/upload_validation.py backend/api/routes/documents.py backend/tests/test_security.py
git commit -m "feat: validar conteudo dos uploads por magic bytes"
```

---

## Task 4: Rate limiting nas rotas de auth

**Files:**
- Create: `backend/rate_limit.py`
- Modify: `backend/api/routes/auth.py`
- Modify: `backend/main.py`
- Modify: `backend/tests/conftest.py`
- Test: `backend/tests/test_security.py` (acrescentar)

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao final de `backend/tests/test_security.py`:

```python
import pytest


@pytest.fixture()
def rate_limited_client(client):
    """Reativa o rate limiting (desligado por padrão nos testes) com estado limpo."""
    from rate_limit import limiter

    limiter.reset()
    limiter.enabled = True
    yield client
    limiter.enabled = False
    limiter.reset()


def test_login_estoura_limite(rate_limited_client):
    body = {"email": "x@x.com", "password": "errada"}
    for _ in range(5):
        assert (
            rate_limited_client.post("/api/auth/login", json=body).status_code
            == 401
        )
    assert rate_limited_client.post("/api/auth/login", json=body).status_code == 429


def test_register_estoura_limite(rate_limited_client):
    for i in range(3):
        r = rate_limited_client.post(
            "/api/auth/register",
            json={"email": f"u{i}@x.com", "password": "senha123"},
        )
        assert r.status_code == 201
    r = rate_limited_client.post(
        "/api/auth/register",
        json={"email": "u9@x.com", "password": "senha123"},
    )
    assert r.status_code == 429
```

(O `import pytest` pode ficar no topo do arquivo junto dos demais imports —
preferível; mostrado aqui apenas para deixar a dependência explícita.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd backend; python -m pytest tests/test_security.py -v`
Expected: os 2 novos testes FALHAM (`ModuleNotFoundError: rate_limit`).

- [ ] **Step 3: Criar o módulo do limiter**

Criar `backend/rate_limit.py`:

```python
"""Rate limiting por IP (slowapi), com suporte ao proxy do Render."""
from slowapi import Limiter
from starlette.requests import Request

from config import settings


def client_ip(request: Request) -> str:
    """IP real do cliente; atrás do proxy, vem em X-Forwarded-For."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=client_ip, enabled=settings.rate_limit_enabled)
```

- [ ] **Step 4: Aplicar os limites nas rotas de auth**

Em `backend/api/routes/auth.py`:

1. Trocar o import do FastAPI para incluir `Request`:

```python
from fastapi import APIRouter, Depends, HTTPException, Request, status
```

2. Adicionar os imports:

```python
from config import settings
from rate_limit import limiter
```

3. Decorar `register` e `login` (decorator do limiter ABAIXO do decorator de
rota, e o parâmetro `request: Request` é obrigatório para o slowapi):

```python
@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.rate_limit_register)
def register(
    request: Request, dados: UserCreate, db: Session = Depends(get_db)
) -> Token:
```

```python
@router.post("/login", response_model=Token)
@limiter.limit(settings.rate_limit_login)
def login(
    request: Request, dados: LoginRequest, db: Session = Depends(get_db)
) -> Token:
```

(Os corpos das funções não mudam. A rota `/me` não é limitada.)

- [ ] **Step 5: Registrar limiter e handler de 429 no app**

Em `backend/main.py`, adicionar os imports:

```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from rate_limit import limiter
```

e, logo após a criação do `app` (`app = FastAPI(...)`):

```python
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

- [ ] **Step 6: Desligar o rate limit por padrão nos testes**

Em `backend/tests/conftest.py`, adicionar o import:

```python
from rate_limit import limiter
```

e, dentro do fixture `client`, como primeira linha do corpo:

```python
    # Rate limiting desligado por padrão (testes dedicados reativam).
    limiter.enabled = False
```

- [ ] **Step 7: Rodar a suíte COMPLETA**

Run: `cd backend; python -m pytest -v`
Expected: todos passam — os 2 testes de rate limit e toda a suíte anterior
(auth, routes, security, extraction, analyzer) sem 429 espúrio.

- [ ] **Step 8: Commit**

```bash
git add backend/rate_limit.py backend/api/routes/auth.py backend/main.py backend/tests/conftest.py backend/tests/test_security.py
git commit -m "feat: rate limiting por IP no login e cadastro"
```

---

## Task 5: Infra e documentação

**Files:**
- Modify: `render.yaml`
- Modify: `backend/.env.example`
- Modify: `README.md`

- [ ] **Step 1: HSTS no Render**

Em `render.yaml`, dentro de `envVars` do serviço `docmind-api`, após o bloco
de `SECRET_KEY`, acrescentar:

```yaml
      # Produção roda em HTTPS: envia o header HSTS.
      - key: HSTS_ENABLED
        value: "true"
```

- [ ] **Step 2: .env.example**

Em `backend/.env.example`, acrescentar ao final:

```
# Headers HSTS (ative apenas em produção, com HTTPS).
HSTS_ENABLED=false
```

- [ ] **Step 3: README**

Em `README.md`:

1. Na lista de **Funcionalidades**, acrescentar após a linha de Contas de usuário:

```markdown
| 🛡️ | **Hardening** | Rate limiting no login, validação de conteúdo dos uploads e headers de segurança |
```

2. Na tabela de **Variáveis de ambiente → Backend**, acrescentar:

```markdown
| `HSTS_ENABLED` | `false` | Envia o header Strict-Transport-Security (ative em produção) |
```

3. Na seção **Referência da API**, logo após a nota sobre autenticação,
acrescentar:

```markdown
> As rotas de login e cadastro têm limite de tentativas por IP (HTTP `429`
> quando excedido). Uploads são validados por assinatura de conteúdo
> (magic bytes), não apenas pela extensão.
```

- [ ] **Step 4: Commit**

```bash
git add render.yaml backend/.env.example README.md
git commit -m "docs: documentar hardening (HSTS_ENABLED, rate limit, magic bytes)"
```

---

## Task 6: Verificação final

**Files:** nenhuma alteração — verificação.

- [ ] **Step 1: Suíte completa verde**

Run: `cd backend; python -m pytest -q`
Expected: todos os testes passam (29 = 21 anteriores + 8 novos de segurança: 2 de headers, 4 de upload, 2 de rate limit).

- [ ] **Step 2: Smoke test no servidor real**

Subir `uvicorn main:app --port 8012` e verificar com httpx/curl:
1. `GET /api/health` → resposta contém `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, CSP e `Referrer-Policy` (sem HSTS, pois `HSTS_ENABLED` local é false).
2. 6 POSTs seguidos em `/api/auth/login` com senha errada → os 5 primeiros `401`, o 6º `429`.
3. Upload de bytes de texto como `x.pdf` (autenticado) → `400`.
4. Upload de PDF real → `200` (fluxo normal preservado).
Derrubar o servidor e apagar `docmind.db`/`uploads` de teste ao final.

- [ ] **Step 3: Commit final (apenas se houver ajustes)**

```bash
git add -A
git commit -m "chore: ajustes finais do hardening"
```

---

## Resumo da cobertura (spec → tasks)

- slowapi + settings (`rate_limit_*`, `hsts_enabled`) → Task 1.
- Headers fixos + HSTS condicional + registro no app → Task 2.
- Magic bytes + arquivo vazio + mensagens de erro 400 → Task 3.
- Limiter com `X-Forwarded-For`, decorators 5/min e 3/min, handler 429,
  testes desligando por padrão → Task 4.
- `HSTS_ENABLED` no Render, `.env.example`, README → Task 5.
- Suíte completa + smoke E2E → Task 6.
