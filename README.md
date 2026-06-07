# 🧠 DocMind AI — Inteligência Documental

Aplicação full-stack que recebe **PDFs ou imagens**, extrai o texto automaticamente
(via PyMuPDF ou OCR) e usa um **LLM** para identificar o tipo do documento, gerar um
resumo e extrair as informações importantes em formato estruturado.

Projeto de portfólio que demonstra Python, FastAPI, React, OCR, integração com LLMs,
banco de dados e Docker.

> 💡 **Roda sem chave de API.** Se você não definir uma `OPENAI_API_KEY`, o sistema
> usa automaticamente um analisador heurístico local (mock) — basta clonar e rodar.

---

## ✨ Funcionalidades

- **Upload** de PDF, PNG, JPG e JPEG (com área *drag-and-drop*).
- **Extração de texto**: PyMuPDF para PDFs, Tesseract OCR para imagens.
- **Análise com IA**: retorna `tipo`, `resumo` e `informacoes` (JSON estruturado).
- **Histórico** de todos os documentos processados.
- **Dashboard** com total processado, tipos identificados e últimos uploads.
- **Visualizador de PDF** completo (PDF.js, com paginação e zoom) e preview de imagens.
- **Dark mode**, loading durante o processamento e **download do resultado em JSON**.

### Exemplo de resposta da análise

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

---

## 🛠️ Tecnologias

**Backend:** Python · FastAPI · SQLAlchemy · SQLite · Pydantic · PyMuPDF · Tesseract (pytesseract) · Pillow · OpenAI
**Frontend:** React · TypeScript · Vite · TailwindCSS · Axios · react-router-dom · react-dropzone · react-pdf
**Infra:** Docker · Docker Compose · Nginx

---

## 📁 Estrutura

```
docmind-ai/
├── backend/
│   ├── api/routes/        # endpoints REST (documents, stats)
│   ├── services/          # extração, OCR, analyzers (OpenAI + mock), pipeline
│   ├── database/          # engine, sessão e criação do schema
│   ├── models/            # modelo SQLAlchemy Document
│   ├── schemas/           # schemas Pydantic
│   ├── tests/             # testes (pytest)
│   ├── config.py
│   ├── main.py
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/         # Dashboard, Upload, Histórico, Detalhes
│   │   ├── components/    # Layout, Dropzone, FilePreview, JsonViewer, etc.
│   │   ├── services/      # cliente Axios
│   │   └── hooks/         # useDocuments, useStats, useTheme
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## 🚀 Como rodar

### Opção 1 — Docker (recomendado)

Pré-requisito: Docker e Docker Compose.

```bash
cp .env.example .env        # opcional: adicione sua OPENAI_API_KEY
docker compose up --build
```

- Frontend: http://localhost:3000
- API (docs Swagger): http://localhost:8000/docs

O Tesseract OCR já vem instalado na imagem do backend.

### Opção 2 — Local (sem Docker)

**Backend** (Python 3.12+):

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env         # opcional
uvicorn main:app --reload
```

> Para OCR de imagens localmente, instale o Tesseract no sistema
> (Windows: https://github.com/UB-Mannheim/tesseract/wiki ;
> Linux: `sudo apt install tesseract-ocr tesseract-ocr-por`).
> A extração de PDFs funciona sem o Tesseract.

**Frontend** (Node 18+):

```bash
cd frontend
npm install
npm run dev
```

Abra http://localhost:5173 (o Vite faz proxy de `/api` para o backend na porta 8000).

---

## ⚙️ Variáveis de ambiente

| Variável         | Padrão          | Descrição                                              |
|------------------|-----------------|--------------------------------------------------------|
| `OPENAI_API_KEY` | *(vazio)*       | Chave da OpenAI. Vazio → usa o analisador mock local.  |
| `OPENAI_MODEL`   | `gpt-4o-mini`   | Modelo usado na análise.                               |
| `DATABASE_URL`   | `sqlite:///./docmind.db` | URL do banco de dados.                       |

---

## 🧪 Testes

```bash
cd backend
.venv\Scripts\python -m pytest -v      # Windows
# ou: python -m pytest -v
```

Cobrem extração de PDF, o analisador mock (regex) e as rotas da API
(upload, detalhes, histórico, stats e validações).

---

## 📌 Notas

- O processamento é **síncrono** no request — simples e suficiente para o escopo.
- O fallback mock garante que o projeto funcione para qualquer pessoa que o clone,
  mesmo sem uma chave da OpenAI.
