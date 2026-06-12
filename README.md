<div align="center">

# 🧠 DocMind AI

### Inteligência Documental com IA — extração automática de informações de PDFs e imagens

Envie um documento, receba **tipo**, **resumo** e **dados estruturados** — extraídos automaticamente por OCR + LLM.

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/tests-pytest%20✓-success?logo=pytest&logoColor=white)](#-testes)

</div>

---

## 📋 Sumário

- [Visão geral](#-visão-geral)
- [Demonstração](#-demonstração)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Stack de tecnologias](#-stack-de-tecnologias)
- [Como executar](#-como-executar)
- [Referência da API](#-referência-da-api)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Testes](#-testes)
- [Variáveis de ambiente](#-variáveis-de-ambiente)
- [Licença](#-licença)

---

## 🎯 Visão geral

**DocMind AI** é uma aplicação full-stack que transforma documentos não estruturados
em dados acionáveis. O usuário envia um **PDF ou imagem**; o sistema extrai o texto
(PyMuPDF para PDFs, **Tesseract OCR** para imagens) e o submete a um **LLM**, que
identifica o tipo do documento, gera um resumo e retorna as informações relevantes
em JSON estruturado.

> **🔑 Funciona mesmo sem chave de API.** Sem uma `OPENAI_API_KEY`, o sistema usa
> automaticamente um analisador heurístico local — basta clonar e executar.

### Exemplo de saída

```json
{
  "tipo": "Currículo",
  "resumo": "Currículo de desenvolvedor de software com experiência em Python e React.",
  "informacoes": {
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "(11) 99999-9999"
  }
}
```

---

## 🖼️ Demonstração

> _Adicione aqui capturas de tela ou um GIF da aplicação em execução._

| Dashboard | Upload | Detalhes |
|-----------|--------|----------|
| `docs/screenshots/dashboard.png` | `docs/screenshots/upload.png` | `docs/screenshots/detail.png` |

---

## ✨ Funcionalidades

| | Recurso | Descrição |
|---|---------|-----------|
| 🔐 | **Contas de usuário** | Cadastro/login com JWT; cada usuário vê só os próprios documentos |
| 📤 | **Upload** | Drag-and-drop de PDF, PNG, JPG e JPEG (até 10 MB) |
| 📝 | **Extração de texto** | PyMuPDF para PDFs · Tesseract OCR para imagens |
| 🤖 | **Análise com IA** | Tipo, resumo e dados estruturados via LLM (com fallback local) |
| 🗂️ | **Histórico** | Registro de todos os documentos processados |
| 📊 | **Dashboard** | Total processado, tipos identificados e últimos uploads |
| 👁️ | **Visualizador PDF** | PDF.js com paginação e zoom · preview de imagens |
| 🌗 | **Dark mode** | Tema claro/escuro persistido no navegador |
| ⬇️ | **Exportação** | Download do resultado da análise em JSON |

---

## 🏗️ Arquitetura

```
┌──────────────┐       HTTP/JSON       ┌────────────────────────────────────────┐
│   Frontend   │ ───────────────────►  │                Backend                 │
│ React + Vite │                       │                FastAPI                 │
│   (nginx)    │ ◄───────────────────  │                                        │
└──────────────┘                       │  ┌──────────────────────────────────┐  │
                                       │  │            Pipeline              │  │
   Upload (PDF/imagem)                 │  │  1. Extração   PyMuPDF / OCR     │  │
                                       │  │  2. Análise    OpenAI ⇄ Mock     │  │
                                       │  │  3. Persistência   SQLite        │  │
                                       │  └──────────────────────────────────┘  │
                                       └────────────────────────────────────────┘
```

**Princípios:** serviços de domínio isolados e testáveis (extração, OCR, análise),
orquestrados por um *pipeline*; controllers finos nas rotas; seleção automática do
provedor de IA conforme a disponibilidade da chave.

---

## 🛠️ Stack de tecnologias

| Camada | Tecnologias |
|--------|-------------|
| **Backend** | Python · FastAPI · SQLAlchemy · SQLite · Pydantic |
| **IA / OCR** | OpenAI API · PyMuPDF · Tesseract (pytesseract) · Pillow |
| **Frontend** | React · TypeScript · Vite · TailwindCSS · Axios · React Router · react-pdf |
| **Infra** | Docker · Docker Compose · Nginx |
| **Qualidade** | pytest · TypeScript estrito |

---

## 🚀 Como executar

### Opção 1 — Docker (recomendado)

```bash
cp .env.example .env          # opcional: defina OPENAI_API_KEY
docker compose up --build
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API (Swagger) | http://localhost:8000/docs |

O Tesseract OCR já vem instalado na imagem do backend.

### Opção 2 — Ambiente local

<details>
<summary><b>Backend</b> (Python 3.12+)</summary>

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # opcional
uvicorn main:app --reload
```

> Para OCR de imagens localmente, instale o Tesseract
> ([Windows](https://github.com/UB-Mannheim/tesseract/wiki) ·
> Linux: `sudo apt install tesseract-ocr tesseract-ocr-por`).
> A extração de PDFs funciona sem o Tesseract.

</details>

<details>
<summary><b>Frontend</b> (Node 18+)</summary>

```bash
cd frontend
npm install
npm run dev
```

Acesse http://localhost:5173 (o Vite faz proxy de `/api` para o backend).

</details>

---

## 📡 Referência da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/auth/register` | Cria conta (email + senha) e retorna um token JWT |
| `POST` | `/api/auth/login` | Autentica e retorna um token JWT |
| `GET` | `/api/auth/me` | Retorna o usuário autenticado |
| `POST` | `/api/documents` | Envia e processa um documento |
| `GET` | `/api/documents` | Lista o histórico |
| `GET` | `/api/documents/{id}` | Detalhes e análise completa |
| `GET` | `/api/documents/{id}/download` | Baixa o resultado em JSON |
| `GET` | `/api/documents/{id}/file` | Serve o arquivo original |
| `GET` | `/api/stats` | Estatísticas do dashboard |
| `GET` | `/api/health` | Health check |

As rotas de **documentos** e **estatísticas** exigem autenticação: envie o header
`Authorization: Bearer <token>` obtido no login/cadastro. Cada usuário acessa
somente os próprios documentos.

> **Atualizando uma instância antiga:** a coluna `documents.user_id` é obrigatória
> e não há migração automática (o schema é criado via `create_all`). Bancos que já
> rodavam antes da autenticação devem ser **recriados do zero** (apague o
> `docmind.db` local; no Render, um novo Postgres já sobe limpo).

Documentação interativa (Swagger UI) disponível em `/docs`.

---

## 📁 Estrutura do projeto

```
docmind-ai/
├── backend/
│   ├── api/routes/        # endpoints REST (documents, stats)
│   ├── services/          # extração, OCR, analyzers (OpenAI + mock), pipeline
│   ├── database/          # engine, sessão e schema
│   ├── models/            # modelo SQLAlchemy Document
│   ├── schemas/           # schemas Pydantic
│   ├── tests/             # testes (pytest)
│   ├── config.py · main.py · Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/         # Dashboard · Upload · Histórico · Detalhes
│   │   ├── components/    # Layout · Dropzone · FilePreview · JsonViewer · ...
│   │   ├── services/      # cliente Axios
│   │   └── hooks/         # useDocuments · useStats · useTheme
│   ├── Dockerfile · nginx.conf
├── docker-compose.yml
└── README.md
```

---

## 🧪 Testes

```bash
cd backend
python -m pytest -v
```

A suíte cobre a extração de PDF, o analisador heurístico (regex) e as rotas da API
(upload, detalhes, histórico, estatísticas e validações de entrada), usando um banco
SQLite em memória.

---

## ⚙️ Variáveis de ambiente

**Backend**

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `OPENAI_API_KEY` | _(vazio)_ | Chave da OpenAI. Vazio → usa o analisador mock local |
| `OPENAI_MODEL` | `gpt-4o-mini` | Modelo usado na análise |
| `SECRET_KEY` | _(dev inseguro)_ | Chave para assinar os tokens JWT. **Defina em produção** (32+ chars aleatórios) |
| `DATABASE_URL` | `sqlite:///./docmind.db` | URL do banco (SQLite local · Postgres em produção) |
| `FRONTEND_ORIGIN` | _(vazio)_ | Domínio do frontend liberado no CORS. Vazio → libera tudo |

**Frontend**

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `VITE_API_URL` | _(vazio)_ | URL do backend em produção. Vazio → usa o proxy do Vite |

---

## 📄 Licença

Distribuído sob a licença MIT. Sinta-se livre para usar como referência de portfólio.

<div align="center">
<sub>Construído com FastAPI, React e ☕</sub>
</div>
