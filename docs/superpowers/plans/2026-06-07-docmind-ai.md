# DocMind AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o DocMind AI — app full-stack que recebe PDFs/imagens, extrai texto (PyMuPDF/Tesseract) e usa LLM (OpenAI com fallback mock) para retornar tipo, resumo e dados estruturados, com frontend React moderno.

**Architecture:** Backend FastAPI + SQLAlchemy síncrono + SQLite. Serviços de domínio isolados (extração, OCR, analyzer) orquestrados por um pipeline. Frontend React+TS+Vite+Tailwind consumindo a API via Axios. Tudo containerizado com Docker Compose.

**Tech Stack:** Python, FastAPI, SQLAlchemy, SQLite, Pydantic, PyMuPDF, pytesseract, Pillow, openai; React, TypeScript, Vite, TailwindCSS, Axios, react-router-dom, react-dropzone, react-pdf; Docker.

---

## Fase 0 — Estrutura e configuração do backend

### Task 0.1: Scaffold do backend
**Files:** Create `backend/requirements.txt`, `backend/.env.example`, `backend/config.py`, `backend/__init__.py` e pacotes vazios.

- [ ] requirements.txt: fastapi, uvicorn[standard], sqlalchemy, pydantic, pydantic-settings, python-multipart, pymupdf, pytesseract, pillow, openai, pytest, httpx.
- [ ] config.py: `Settings(BaseSettings)` com `openai_api_key: str|None`, `openai_model="gpt-4o-mini"`, `database_url="sqlite:///./docmind.db"`, `upload_dir="uploads"`, `max_file_size_mb=10`, `allowed_extensions={pdf,png,jpg,jpeg}`. Instância `settings = Settings()`.
- [ ] .env.example com `OPENAI_API_KEY=` e `OPENAI_MODEL=gpt-4o-mini`.
- [ ] Commit: `feat(backend): scaffold e configuração`.

### Task 0.2: Database e modelo
**Files:** Create `backend/database/session.py`, `backend/database/init_db.py`, `backend/models/document.py`.

- [ ] session.py: `engine` (com `connect_args={"check_same_thread": False}`), `SessionLocal`, `Base`, `get_db()` dependency.
- [ ] models/document.py: classe `Document(Base)` com colunas do spec (id, filename, file_path, mime_type, doc_type, summary, analysis_json, status, error, created_at default utcnow).
- [ ] init_db.py: `init_db()` → `Base.metadata.create_all(bind=engine)`.
- [ ] Commit: `feat(backend): modelo Document e sessão de banco`.

---

## Fase 1 — Serviços de domínio (TDD)

### Task 1.1: Extração de texto de PDF
**Files:** Create `backend/services/extraction.py`, `backend/tests/test_extraction.py`, `backend/tests/__init__.py`.

- [ ] **Step 1 — teste que falha:**
```python
# backend/tests/test_extraction.py
import fitz
from services.extraction import extract_pdf_text

def test_extract_pdf_text_reads_content(tmp_path):
    pdf_path = tmp_path / "doc.pdf"
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Relatorio de teste DocMind")
    doc.save(pdf_path)
    doc.close()

    text = extract_pdf_text(str(pdf_path))
    assert "Relatorio de teste DocMind" in text
```
- [ ] **Step 2 — rodar e ver falhar:** `cd backend && python -m pytest tests/test_extraction.py -v` → ImportError.
- [ ] **Step 3 — implementar:**
```python
# backend/services/extraction.py
"""Extração de texto de documentos."""
import fitz  # PyMuPDF


def extract_pdf_text(file_path: str) -> str:
    """Extrai todo o texto de um PDF usando PyMuPDF."""
    texto_paginas = []
    with fitz.open(file_path) as doc:
        for pagina in doc:
            texto_paginas.append(pagina.get_text())
    return "\n".join(texto_paginas).strip()
```
- [ ] **Step 4 — passar:** `python -m pytest tests/test_extraction.py -v` → PASS.
- [ ] **Step 5 — commit:** `feat(backend): extração de texto de PDF`.

### Task 1.2: OCR de imagens
**Files:** Modify `backend/services/ocr.py` (create).

- [ ] Implementar (sem teste unitário do binário — Tesseract pode não existir no host; erro claro):
```python
# backend/services/ocr.py
"""OCR de imagens com Tesseract."""
from PIL import Image
import pytesseract


def extract_image_text(file_path: str) -> str:
    """Extrai texto de uma imagem via Tesseract (idiomas por+eng)."""
    try:
        imagem = Image.open(file_path)
        return pytesseract.image_to_string(imagem, lang="por+eng").strip()
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError(
            "Tesseract OCR não encontrado. Instale o Tesseract ou use o Docker."
        ) from exc
```
- [ ] Commit: `feat(backend): OCR de imagens com Tesseract`.

### Task 1.3: Dispatch de extração por tipo
**Files:** Modify `backend/services/extraction.py`, `backend/tests/test_extraction.py`.

- [ ] **Step 1 — teste:**
```python
def test_extract_text_dispatches_pdf(tmp_path):
    from services.extraction import extract_text
    import fitz
    pdf_path = tmp_path / "d.pdf"
    doc = fitz.open(); p = doc.new_page(); p.insert_text((72,72), "Conteudo PDF"); doc.save(pdf_path); doc.close()
    assert "Conteudo PDF" in extract_text(str(pdf_path), "application/pdf")
```
- [ ] **Step 2 — falhar.**
- [ ] **Step 3 — implementar em extraction.py:**
```python
def extract_text(file_path: str, mime_type: str) -> str:
    """Escolhe o extrator conforme o mime type."""
    if mime_type == "application/pdf":
        return extract_pdf_text(file_path)
    from services.ocr import extract_image_text
    return extract_image_text(file_path)
```
- [ ] **Step 4 — passar. Step 5 — commit:** `feat(backend): dispatch de extração por mime`.

### Task 1.4: Schemas Pydantic
**Files:** Create `backend/schemas/document.py`.

- [ ] Implementar:
```python
# backend/schemas/document.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AnalysisResult(BaseModel):
    tipo: str
    resumo: str
    informacoes: dict[str, object] = {}


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    filename: str
    mime_type: str
    doc_type: str | None
    summary: str | None
    status: str
    error: str | None
    created_at: datetime


class DocumentDetail(DocumentRead):
    analysis: AnalysisResult | None = None


class TipoContagem(BaseModel):
    tipo: str
    total: int


class StatsResponse(BaseModel):
    total: int
    por_tipo: list[TipoContagem]
    ultimos: list[DocumentRead]
```
- [ ] Commit: `feat(backend): schemas Pydantic`.

### Task 1.5: Mock analyzer (TDD)
**Files:** Create `backend/services/analyzer_mock.py`, `backend/tests/test_analyzer_mock.py`.

- [ ] **Step 1 — teste:**
```python
# backend/tests/test_analyzer_mock.py
from services.analyzer_mock import analyze_mock

def test_mock_detecta_email_e_telefone():
    texto = "Joao Silva\njoao@email.com\n(11) 99999-9999\nDesenvolvedor de software"
    r = analyze_mock(texto)
    assert r.informacoes.get("email") == "joao@email.com"
    assert "99999-9999" in r.informacoes.get("telefone", "")
    assert r.tipo and r.resumo
```
- [ ] **Step 2 — falhar.**
- [ ] **Step 3 — implementar:**
```python
# backend/services/analyzer_mock.py
"""Analisador heurístico (fallback sem OpenAI)."""
import re
from schemas.document import AnalysisResult

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
TEL_RE = re.compile(r"\(?\d{2}\)?\s?\d{4,5}-?\d{4}")


def _detecta_tipo(texto: str) -> str:
    t = texto.lower()
    if any(p in t for p in ("currículo", "curriculo", "experiência", "formação")):
        return "Currículo"
    if any(p in t for p in ("nota fiscal", "cnpj", "valor total", "fatura")):
        return "Nota Fiscal"
    if "contrato" in t:
        return "Contrato"
    return "Documento"


def analyze_mock(texto: str) -> AnalysisResult:
    informacoes: dict[str, object] = {}
    if m := EMAIL_RE.search(texto):
        informacoes["email"] = m.group(0)
    if m := TEL_RE.search(texto):
        informacoes["telefone"] = m.group(0)
    linhas = [l.strip() for l in texto.splitlines() if l.strip()]
    if linhas:
        informacoes["nome"] = linhas[0]
    tipo = _detecta_tipo(texto)
    resumo = (texto[:200] + "...") if len(texto) > 200 else (texto or "Documento sem texto extraível.")
    return AnalysisResult(tipo=tipo, resumo=resumo, informacoes=informacoes)
```
- [ ] **Step 4 — passar. Step 5 — commit:** `feat(backend): mock analyzer com heurística regex`.

### Task 1.6: OpenAI analyzer
**Files:** Create `backend/services/analyzer_openai.py`.

- [ ] Implementar (JSON mode):
```python
# backend/services/analyzer_openai.py
"""Analisador via OpenAI (JSON mode)."""
import json
from openai import OpenAI
from config import settings
from schemas.document import AnalysisResult

PROMPT = (
    "Você é um extrator de informações de documentos. "
    "Analise o texto e responda APENAS com JSON no formato: "
    '{"tipo": str, "resumo": str, "informacoes": {chave: valor}}. '
    "tipo = categoria do documento (ex: Currículo, Nota Fiscal, Contrato). "
    "resumo = 1-2 frases. informacoes = dados importantes encontrados."
)


def analyze_openai(texto: str) -> AnalysisResult:
    client = OpenAI(api_key=settings.openai_api_key)
    resp = client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": PROMPT},
            {"role": "user", "content": texto[:12000]},
        ],
    )
    dados = json.loads(resp.choices[0].message.content)
    return AnalysisResult(
        tipo=dados.get("tipo", "Documento"),
        resumo=dados.get("resumo", ""),
        informacoes=dados.get("informacoes", {}),
    )
```
- [ ] Commit: `feat(backend): analyzer OpenAI`.

### Task 1.7: AnalyzerService (seleção) + pipeline
**Files:** Create `backend/services/analyzer.py`, `backend/services/pipeline.py`.

- [ ] analyzer.py:
```python
# backend/services/analyzer.py
"""Seleciona OpenAI ou mock conforme disponibilidade da chave."""
from config import settings
from schemas.document import AnalysisResult
from services.analyzer_mock import analyze_mock


def analyze(texto: str) -> AnalysisResult:
    if settings.openai_api_key:
        try:
            from services.analyzer_openai import analyze_openai
            return analyze_openai(texto)
        except Exception:
            return analyze_mock(texto)
    return analyze_mock(texto)
```
- [ ] pipeline.py: `process_document(db, document)` → extrai texto, chama `analyze`, grava `doc_type/summary/analysis_json/status`; em erro grava `status="error"` e `error`.
```python
# backend/services/pipeline.py
"""Orquestra extração → análise → persistência."""
import json
from sqlalchemy.orm import Session
from models.document import Document
from services.extraction import extract_text
from services.analyzer import analyze


def process_document(db: Session, documento: Document) -> None:
    try:
        texto = extract_text(documento.file_path, documento.mime_type)
        resultado = analyze(texto)
        documento.doc_type = resultado.tipo
        documento.summary = resultado.resumo
        documento.analysis_json = json.dumps(resultado.model_dump(), ensure_ascii=False)
        documento.status = "done"
    except Exception as exc:  # noqa: BLE001
        documento.status = "error"
        documento.error = str(exc)
    db.commit()
    db.refresh(documento)
```
- [ ] Commit: `feat(backend): analyzer service e pipeline`.

---

## Fase 2 — API (rotas)

### Task 2.1: Rotas de documentos
**Files:** Create `backend/api/routes/documents.py`, `backend/api/__init__.py`, `backend/api/routes/__init__.py`.

- [ ] Implementar endpoints: POST (valida extensão/tamanho, salva em upload_dir com nome único, cria registro processing, chama pipeline, retorna DocumentDetail), GET lista, GET por id (monta DocumentDetail com analysis a partir de analysis_json), GET /download (StreamingResponse/Response com header Content-Disposition), GET /file (FileResponse).
```python
# backend/api/routes/documents.py
import json, os, uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
from config import settings
from database.session import get_db
from models.document import Document
from schemas.document import DocumentRead, DocumentDetail, AnalysisResult
from services.pipeline import process_document

router = APIRouter(prefix="/api/documents", tags=["documents"])

_MIME = {"pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg"}


def _to_detail(doc: Document) -> DocumentDetail:
    analysis = None
    if doc.analysis_json:
        analysis = AnalysisResult(**json.loads(doc.analysis_json))
    return DocumentDetail(**DocumentRead.model_validate(doc).model_dump(), analysis=analysis)


@router.post("", response_model=DocumentDetail)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(400, f"Extensão não suportada: .{ext}")
    conteudo = await file.read()
    if len(conteudo) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(400, "Arquivo excede o tamanho máximo (10 MB).")
    os.makedirs(settings.upload_dir, exist_ok=True)
    nome = f"{uuid.uuid4().hex}.{ext}"
    caminho = os.path.join(settings.upload_dir, nome)
    with open(caminho, "wb") as f:
        f.write(conteudo)
    doc = Document(filename=file.filename, file_path=caminho, mime_type=_MIME[ext], status="processing")
    db.add(doc); db.commit(); db.refresh(doc)
    process_document(db, doc)
    return _to_detail(doc)


@router.get("", response_model=list[DocumentRead])
def listar(db: Session = Depends(get_db)):
    return db.query(Document).order_by(desc(Document.created_at)).all()


@router.get("/{doc_id}", response_model=DocumentDetail)
def detalhe(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Documento não encontrado.")
    return _to_detail(doc)


@router.get("/{doc_id}/download")
def download(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc or not doc.analysis_json:
        raise HTTPException(404, "Análise não encontrada.")
    return Response(
        content=doc.analysis_json,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="analise_{doc_id}.json"'},
    )


@router.get("/{doc_id}/file")
def arquivo(doc_id: int, db: Session = Depends(get_db)):
    doc = db.get(Document, doc_id)
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(404, "Arquivo não encontrado.")
    return FileResponse(doc.file_path, media_type=doc.mime_type, filename=doc.filename)
```
- [ ] Commit: `feat(backend): rotas de documentos`.

### Task 2.2: Rota de stats
**Files:** Create `backend/api/routes/stats.py`.

- [ ] Implementar:
```python
# backend/api/routes/stats.py
from fastapi import APIRouter, Depends
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from database.session import get_db
from models.document import Document
from schemas.document import StatsResponse, TipoContagem, DocumentRead

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
def stats(db: Session = Depends(get_db)):
    total = db.query(Document).count()
    por_tipo = [
        TipoContagem(tipo=t or "Desconhecido", total=n)
        for t, n in db.query(Document.doc_type, func.count(Document.id))
        .group_by(Document.doc_type).all()
    ]
    ultimos = db.query(Document).order_by(desc(Document.created_at)).limit(5).all()
    return StatsResponse(total=total, por_tipo=por_tipo, ultimos=ultimos)
```
- [ ] Commit: `feat(backend): rota de estatísticas`.

### Task 2.3: main.py (app FastAPI)
**Files:** Create `backend/main.py`.

- [ ] Implementar: cria app, CORS (allow localhost:5173 e *), inclui routers, `init_db()` no startup.
```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.init_db import init_db
from api.routes import documents, stats

app = FastAPI(title="DocMind AI")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(documents.router)
app.include_router(stats.router)


@app.on_event("startup")
def _startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}
```
- [ ] Commit: `feat(backend): app FastAPI principal`.

### Task 2.4: Teste de rotas (TDD de integração)
**Files:** Create `backend/tests/test_routes.py`, `backend/tests/conftest.py`.

- [ ] conftest.py: override `get_db` para SQLite em memória; fixture `client` (TestClient). Garantir `settings.openai_api_key=None` para usar mock.
- [ ] test_routes.py: gera PDF em memória, faz upload, valida 200 + `analysis.tipo`; testa GET lista, GET detalhe, GET stats, e rejeição de extensão inválida.
```python
# backend/tests/test_routes.py
import io, fitz

def _pdf_bytes():
    doc = fitz.open(); p = doc.new_page(); p.insert_text((72,72), "Joao Silva joao@email.com Curriculo")
    buf = doc.tobytes(); doc.close(); return buf

def test_upload_e_detalhe(client):
    r = client.post("/api/documents", files={"file": ("cv.pdf", _pdf_bytes(), "application/pdf")})
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "done"
    assert data["analysis"]["tipo"]
    doc_id = data["id"]
    assert client.get(f"/api/documents/{doc_id}").status_code == 200
    assert client.get("/api/documents").status_code == 200
    s = client.get("/api/stats").json()
    assert s["total"] >= 1

def test_extensao_invalida(client):
    r = client.post("/api/documents", files={"file": ("x.txt", b"oi", "text/plain")})
    assert r.status_code == 400
```
- [ ] Rodar toda a suíte: `cd backend && python -m pytest -v` → tudo PASS.
- [ ] Commit: `test(backend): testes de integração das rotas`.

---

## Fase 3 — Frontend

### Task 3.1: Scaffold Vite + Tailwind
**Files:** `frontend/package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/index.css`, `tsconfig.json`.

- [ ] Vite React-TS; instalar axios, react-router-dom, react-dropzone, react-pdf, tailwindcss, postcss, autoprefixer.
- [ ] tailwind.config.js com `darkMode: "class"` e content `./index.html`, `./src/**/*.{ts,tsx}`.
- [ ] index.css com diretivas @tailwind base/components/utilities.
- [ ] vite.config.ts com proxy `/api` → `http://localhost:8000`.
- [ ] Commit: `feat(frontend): scaffold Vite + Tailwind`.

### Task 3.2: Cliente API e tipos
**Files:** Create `frontend/src/services/api.ts`.

- [ ] Tipos `AnalysisResult`, `DocumentRead`, `DocumentDetail`, `Stats`; funções `uploadDocument`, `getDocuments`, `getDocument`, `getStats`, `downloadUrl`, `fileUrl`. Axios baseURL `/api`.
- [ ] Commit: `feat(frontend): cliente API e tipos`.

### Task 3.3: Tema (dark mode) e Layout
**Files:** Create `src/hooks/useTheme.ts`, `src/components/ThemeToggle.tsx`, `src/components/Layout.tsx`.

- [ ] useTheme: estado `theme`, persiste em localStorage, aplica/remove classe `dark` em `document.documentElement`.
- [ ] Layout: sidebar com links (Dashboard/Upload/Histórico) + ThemeToggle; `<Outlet/>`.
- [ ] Commit: `feat(frontend): layout SaaS e dark mode`.

### Task 3.4: Componentes reutilizáveis
**Files:** Create `StatCard.tsx`, `Loader.tsx`, `Dropzone.tsx`, `DocumentTable.tsx`, `JsonViewer.tsx`, `FilePreview.tsx`.

- [ ] Dropzone (react-dropzone, aceita pdf/png/jpg/jpeg). Loader (spinner). JsonViewer (`<pre>` formatado). FilePreview: se mime pdf → react-pdf `<Document><Page>` com controles de página e zoom; senão `<img>`.
- [ ] Commit: `feat(frontend): componentes reutilizáveis`.

### Task 3.5: Hooks de dados
**Files:** Create `src/hooks/useDocuments.ts`, `src/hooks/useStats.ts`.

- [ ] useDocuments: carrega lista; useStats: carrega stats. Estados loading/error.
- [ ] Commit: `feat(frontend): hooks de dados`.

### Task 3.6: Páginas
**Files:** Create `Dashboard.tsx`, `Upload.tsx`, `History.tsx`, `DocumentDetail.tsx`; wire em `App.tsx`.

- [ ] Dashboard: StatCards (total) + lista tipos + últimos uploads.
- [ ] Upload: Dropzone → uploadDocument → Loader durante processamento → navega para `/documents/:id`.
- [ ] History: DocumentTable com link para detalhes.
- [ ] DocumentDetail: FilePreview + JsonViewer + botão download (link para downloadUrl).
- [ ] App.tsx: rotas com Layout.
- [ ] `cd frontend && npm run build` → sucesso.
- [ ] Commit: `feat(frontend): páginas Dashboard/Upload/Histórico/Detalhes`.

---

## Fase 4 — Docker e documentação

### Task 4.1: Dockerfile backend
**Files:** Create `backend/Dockerfile`, `backend/.dockerignore`.

- [ ] python:3.12-slim; `apt-get install tesseract-ocr tesseract-ocr-por`; copia, instala requirements; `CMD uvicorn main:app --host 0.0.0.0 --port 8000`.
- [ ] Commit: `feat(docker): Dockerfile do backend com Tesseract`.

### Task 4.2: Dockerfile frontend + nginx
**Files:** Create `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`.

- [ ] Multi-stage: node build → nginx serve `dist`; nginx.conf com try_files SPA e proxy `/api` → `http://backend:8000`.
- [ ] Commit: `feat(docker): Dockerfile do frontend com nginx`.

### Task 4.3: docker-compose
**Files:** Create `docker-compose.yml`, `.env.example` (raiz).

- [ ] Serviços backend (porta 8000, volumes uploads/ e db, env OPENAI_API_KEY) e frontend (porta 3000 → 80, depends_on backend).
- [ ] Commit: `feat(docker): docker-compose`.

### Task 4.4: README e verificação final
**Files:** Create `README.md`.

- [ ] README em PT-BR: descrição, stack, funcionalidades, estrutura, como rodar com Docker (`docker compose up`), como rodar local (backend uvicorn + frontend npm), variáveis de ambiente, nota sobre fallback mock e Tesseract.
- [ ] Rodar `cd backend && python -m pytest -v` e `cd frontend && npm run build` para confirmar verde.
- [ ] Commit: `docs: README completo`.

---

## Self-Review (coberto)
- Upload/validação → 2.1; extração PDF → 1.1/1.3; OCR → 1.2; análise IA+mock → 1.5/1.6/1.7; histórico → 2.1; dashboard/stats → 2.2; download JSON → 2.1; preview PDF.js → 3.4; dark mode → 3.3; drag-and-drop → 3.4; loading → 3.4/3.6; Docker → 4.x; README/testes → 4.4. Tipos consistentes (AnalysisResult/DocumentRead/DocumentDetail usados igualmente em schemas, rotas e frontend).
