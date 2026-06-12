# Design — Hardening de segurança (rate limiting, validação de upload, headers)

**Data:** 2026-06-12
**Projeto:** DocMind AI
**Status:** Aprovado (aguardando revisão do spec)

## Problema

O app tem autenticação JWT e isolamento por usuário, mas continua exposto a
ataques web comuns:

1. **Força bruta no login** — `/api/auth/login` aceita tentativas ilimitadas;
   um atacante pode testar senhas à vontade. O register também aceita cadastros
   em massa.
2. **Upload confia na extensão** — a rota de upload valida apenas o sufixo do
   nome do arquivo. Qualquer conteúdo renomeado para `.pdf`/`.png`/`.jpg` é
   aceito, salvo em disco e entregue aos parsers (PyMuPDF/Pillow/Tesseract).
   Arquivos vazios também passam.
3. **Respostas sem headers de proteção** — a API não envia
   `X-Content-Type-Options`, `X-Frame-Options`, CSP, HSTS etc., deixando o
   navegador sem instruções contra sniffing, clickjacking e downgrade.

## Objetivo

Endurecer o backend com três medidas concretas, testadas e de baixo custo de
manutenção. Sem mudanças no frontend.

## Decisões (tomadas no brainstorming)

| Decisão | Escolha |
|---------|---------|
| Tipo de trabalho | Hardening prático (mudanças no código), não auditoria nem feature visível |
| Medidas incluídas | Rate limiting no auth · validação real de upload · headers de segurança |
| Fora de escopo | CORS restrito (decisão do usuário); 2FA/recuperação de senha; CSP do frontend (fica no nginx/Vercel); scan de dependências no CI |

---

## 1. Rate limiting no auth

**Biblioteca:** `slowapi` (padrão de fato no FastAPI), storage em memória.

- `POST /api/auth/login` → limite **5/minute** por IP.
- `POST /api/auth/register` → limite **3/minute** por IP.
- Estourou o limite → **429 Too Many Requests** (handler registrado no app).
- Demais rotas não são limitadas (já exigem token).

**Extração do IP real:** em produção o app roda atrás do proxy do Render; o IP
do cliente vem em `X-Forwarded-For`. A key function usa o primeiro IP desse
header quando presente, senão `request.client.host`.

**Configurável:** `settings.rate_limit_login` (default `"5/minute"`),
`settings.rate_limit_register` (default `"3/minute"`) e
`settings.rate_limit_enabled` (default `True`). Os testes existentes desativam
ou afrouxam via fixture para não esbarrar no limite; testes específicos do rate
limit usam limites apertados.

**Trade-offs aceitos:** storage em memória reseta a contagem no restart e não
compartilha entre instâncias — adequado ao deploy atual (1 instância no Render
free). Migração futura para Redis muda só o backend de storage.

## 2. Validação real de upload

**Novo módulo:** `backend/services/upload_validation.py`, sem dependências
novas (magic bytes verificados em código próprio).

```python
ASSINATURAS = {
    "pdf":  [b"%PDF-"],
    "png":  [b"\x89PNG\r\n\x1a\n"],
    "jpg":  [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
}

def conteudo_corresponde(ext: str, conteudo: bytes) -> bool: ...
```

**Na rota de upload (`api/routes/documents.py`):**
- Arquivo vazio (0 bytes) → `400` ("Arquivo vazio.").
- `conteudo_corresponde(ext, conteudo)` falso → `400` ("O conteúdo do arquivo
  não corresponde à extensão .{ext}.").
- Checagens ocorrem após a validação de extensão/tamanho já existente e antes
  de salvar em disco.

**Limite da proteção (aceito):** magic bytes garantem que o parser certo recebe
o formato certo e rejeitam lixo disfarçado; não detectam payloads maliciosos
dentro de um arquivo estruturalmente válido — mitigado porque o arquivo nunca é
executado, apenas lido por PyMuPDF/Pillow.

## 3. Headers de segurança

**Novo middleware:** `SecurityHeadersMiddleware` (módulo
`backend/middleware.py`), puro ASGI/Starlette, adiciona a toda resposta:

| Header | Valor |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `no-referrer` |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` — **somente quando** `settings.hsts_enabled` for `True` |

- `settings.hsts_enabled: bool = False`; no `render.yaml`, `HSTS_ENABLED=true`.
  Evita que dev local em HTTP grave política HSTS no navegador.
- O CSP é mínimo porque este backend é uma API (serve JSON e arquivos); o CSP
  do frontend pertence ao nginx/Vercel e fica como melhoria futura.
- Registrado em `main.py` junto ao CORS middleware.

---

## Arquivos afetados

**Novos:** `backend/services/upload_validation.py`, `backend/middleware.py`,
`backend/tests/test_security.py`.
**Alterados:** `backend/api/routes/auth.py` (decorators de limite),
`backend/api/routes/documents.py` (validação de conteúdo),
`backend/main.py` (limiter + middleware), `backend/config.py` (novas settings),
`backend/requirements.txt` (slowapi), `backend/tests/conftest.py` (desativar
rate limit por padrão nos testes), `render.yaml` (`HSTS_ENABLED`),
`backend/.env.example`, `README.md`.

## Erros e respostas

- Rate limit excedido → `429` com JSON de detalhe.
- Conteúdo não corresponde à extensão → `400` com mensagem clara.
- Arquivo vazio → `400`.
- Nenhuma mudança nos contratos existentes (200/201/400/401/404/409/422
  permanecem).

## Testes

**Novo `tests/test_security.py`:**
- Login estoura limite → 6ª tentativa em sequência retorna `429` (com limite
  apertado/realista habilitado via fixture própria).
- Register estoura limite → `429`.
- Upload de bytes de texto nomeados `x.pdf` → `400`.
- Upload de PNG real nomeado `x.pdf` (extensão certa, conteúdo errado) → `400`.
- Upload de arquivo vazio → `400`.
- Resposta de qualquer rota (ex.: `/api/health`) contém os 4 headers fixos;
  HSTS presente apenas com `hsts_enabled=True`.

**Suíte existente:** continua verde — conftest desativa o rate limit por
padrão (`rate_limit_enabled=False`) para que os testes de auth não esbarrem
no limite.
