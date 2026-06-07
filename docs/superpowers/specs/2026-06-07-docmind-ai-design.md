# DocMind AI — Documento de Design

**Data:** 2026-06-07
**Status:** Aprovado para implementação

## 1. Objetivo

Sistema de Inteligência Documental para portfólio. O usuário envia PDFs ou imagens
e a IA extrai automaticamente as informações importantes do documento (tipo, resumo
e dados estruturados). Projeto simples, moderno, pensado para ser publicado no GitHub
como demonstração de habilidades full-stack + IA.

Idioma: **tudo em português** (UI, README, comentários no código).

## 2. Decisões de design (locked)

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Provedor LLM | **OpenAI com fallback mock** | Roda para qualquer pessoa que clonar, mesmo sem `OPENAI_API_KEY` |
| OCR | **Tesseract via Docker, local opcional** | Sempre funciona no container; erro claro se faltar localmente |
| ORM | **SQLAlchemy síncrono (clássico)** | Simplicidade; FastAPI roda endpoints em threadpool |
| Visualização de PDF | **PDF.js completo via `react-pdf`** | Zoom + paginação, mais impressionante para portfólio |

## 3. Fluxo principal

```
Upload (PDF/PNG/JPG/JPEG) ─► POST /api/documents
        │
        ├─ 1. Valida extensão + tamanho; salva em uploads/ ; cria registro SQLite (status: processing)
        ├─ 2. Extração de texto:
        │       PDF      → PyMuPDF (fitz)
        │       imagem   → Pillow + Tesseract OCR (idioma por+eng)
        ├─ 3. Análise IA:  texto → AnalyzerService
        │       OPENAI_API_KEY presente → OpenAI (JSON mode, modelo gpt-4o-mini)
        │       ausente                  → MockAnalyzer (heurística regex: nome/email/telefone/tipo)
        └─ 4. Persiste resultado JSON (status: done | error) ─► retorna ao frontend
```

## 4. Backend (`/backend`)

Stack: Python, FastAPI, SQLAlchemy (síncrono), SQLite, Pydantic, PyMuPDF, pytesseract, Pillow, openai.

### Estrutura
```
backend/
  main.py              # cria app FastAPI, CORS, monta routers, init_db no startup
  config.py            # Settings via pydantic-settings (.env)
  api/
    routes/
      documents.py     # endpoints de documentos
      stats.py         # endpoint de estatísticas
  services/
    extraction.py      # extrai texto de PDF (PyMuPDF) e dispatch por mime
    ocr.py             # OCR de imagens (Pillow + pytesseract), erro claro se faltar binário
    analyzer.py        # AnalyzerService: escolhe OpenAI ou Mock
    analyzer_openai.py # chamada à OpenAI em JSON mode
    analyzer_mock.py   # extração heurística por regex
    pipeline.py        # orquestra extração → análise → persistência
  database/
    session.py         # engine + SessionLocal + get_db dependency
    init_db.py         # cria tabelas
  models/
    document.py        # modelo SQLAlchemy Document
  schemas/
    document.py        # Pydantic: DocumentRead, DocumentList, AnalysisResult, StatsResponse
  tests/
    test_extraction.py
    test_analyzer_mock.py
    test_routes.py
  requirements.txt
  Dockerfile
  .env.example
```

### Modelo `Document`
`id (int pk)`, `filename (str)`, `file_path (str)`, `mime_type (str)`,
`doc_type (str|null)`, `summary (text|null)`, `analysis_json (text|null, JSON serializado)`,
`status (str: processing|done|error)`, `error (text|null)`, `created_at (datetime)`.

### Endpoints
- `POST /api/documents` — upload + processamento síncrono; valida extensão (pdf/png/jpg/jpeg) e tamanho (máx. 10 MB)
- `GET  /api/documents` — histórico (lista, ordem desc por data)
- `GET  /api/documents/{id}` — detalhes completos
- `GET  /api/documents/{id}/download` — resultado da análise como download `.json`
- `GET  /api/documents/{id}/file` — serve o arquivo original (para o visualizador)
- `GET  /api/stats` — total processado, contagem por tipo, últimos 5 uploads

### Contrato de saída da análise (Pydantic `AnalysisResult`)
```json
{
  "tipo": "Currículo",
  "resumo": "Currículo de desenvolvedor de software",
  "informacoes": {
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "(11) 99999-9999"
  }
}
```
`informacoes` é um dicionário flexível (chaves variam por tipo de documento).

## 5. Frontend (`/frontend`)

Stack: React + TypeScript + Vite + TailwindCSS + Axios + react-router-dom + react-dropzone + react-pdf.

### Estrutura
```
frontend/
  src/
    pages/
      Dashboard.tsx      # estatísticas (cards + últimos uploads + tipos)
      Upload.tsx         # área drag-and-drop + loading durante processamento
      History.tsx        # tabela de documentos analisados
      DocumentDetail.tsx # visualizador do arquivo + resultado JSON + download
    components/
      Layout.tsx         # sidebar + topbar + ThemeToggle
      StatCard.tsx
      Dropzone.tsx
      DocumentTable.tsx
      JsonViewer.tsx
      FilePreview.tsx    # react-pdf (PDF, zoom/paginação) ou <img> (imagem)
      Loader.tsx
      ThemeToggle.tsx
    services/
      api.ts             # cliente Axios + tipos TypeScript
    hooks/
      useDocuments.ts
      useStats.ts
      useTheme.ts        # dark mode persistido em localStorage
    App.tsx              # rotas
    main.tsx
  index.html
  package.json
  tailwind.config.js
  vite.config.ts
  Dockerfile             # build Vite → nginx
  nginx.conf            # serve SPA + proxy /api → backend
```

### Páginas
- **Dashboard:** total de documentos processados, tipos identificados (contagem), últimos uploads.
- **Upload:** drag-and-drop (react-dropzone), validação de tipo, loader durante o processamento, redireciona para os detalhes ao concluir.
- **Histórico:** tabela com nome do arquivo, tipo, data, status; link para detalhes.
- **Detalhes:** visualizador do arquivo (PDF.js com zoom/paginação ou imagem), resultado completo da extração (JsonViewer) e botão de download do JSON.

### Diferenciais
Dark mode (classe `dark` do Tailwind + localStorage), upload drag-and-drop, loading
durante processamento, visualizador PDF.js completo, download do resultado em JSON.
Estética inspirada em SaaS moderno (sidebar, cards, espaçamento generoso).

## 6. Infraestrutura

- `docker-compose.yml`: serviços `backend` (uvicorn, Tesseract instalado) e `frontend`
  (build Vite servido por nginx, proxy `/api` → backend). Volumes para `uploads/` e
  `docmind.db` persistirem.
- `backend/Dockerfile`: imagem python-slim + `tesseract-ocr` + `tesseract-ocr-por`.
- `.env.example` na raiz e no backend (`OPENAI_API_KEY`, `OPENAI_MODEL`, etc.).
- `README.md` completo em português: o que é, stack, screenshots placeholder,
  como rodar com Docker, como rodar localmente (backend + frontend), variáveis de ambiente.

## 7. Testes

`pytest` no backend:
- `test_extraction.py` — extração de texto de um PDF gerado em memória.
- `test_analyzer_mock.py` — regex detecta email/telefone/nome e classifica tipo.
- `test_routes.py` — upload, listagem, detalhes e stats via `TestClient` com SQLite em memória (OpenAI desligada → usa mock).

## 8. Fora de escopo (YAGNI)

Autenticação/login, multiusuário, processamento assíncrono com fila (Celery),
armazenamento em nuvem (S3), busca full-text, edição do resultado. O processamento
é síncrono no request — suficiente para um projeto de portfólio.
