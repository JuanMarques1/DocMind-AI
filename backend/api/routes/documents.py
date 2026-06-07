"""Rotas REST para upload e consulta de documentos."""
import json
import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from sqlalchemy import desc
from sqlalchemy.orm import Session

from config import settings
from database.session import get_db
from models.document import Document
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


@router.post("", response_model=DocumentDetail)
async def upload_document(
    file: UploadFile = File(...), db: Session = Depends(get_db)
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
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    process_document(db, doc)
    return _to_detail(doc)


@router.get("", response_model=list[DocumentRead])
def listar_documentos(db: Session = Depends(get_db)) -> list[Document]:
    """Lista todos os documentos, do mais recente para o mais antigo."""
    return db.query(Document).order_by(desc(Document.created_at)).all()


@router.get("/{doc_id}", response_model=DocumentDetail)
def detalhe_documento(doc_id: int, db: Session = Depends(get_db)) -> DocumentDetail:
    """Retorna os detalhes completos de um documento."""
    doc = db.get(Document, doc_id)
    if not doc:
        raise HTTPException(404, "Documento não encontrado.")
    return _to_detail(doc)


@router.get("/{doc_id}/download")
def download_resultado(doc_id: int, db: Session = Depends(get_db)) -> Response:
    """Baixa o resultado da análise como arquivo JSON."""
    doc = db.get(Document, doc_id)
    if not doc or not doc.analysis_json:
        raise HTTPException(404, "Análise não encontrada.")
    return Response(
        content=doc.analysis_json,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="analise_{doc_id}.json"'
        },
    )


@router.get("/{doc_id}/file")
def arquivo_original(doc_id: int, db: Session = Depends(get_db)) -> FileResponse:
    """Serve o arquivo original (para o visualizador no frontend)."""
    doc = db.get(Document, doc_id)
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(404, "Arquivo não encontrado.")
    return FileResponse(doc.file_path, media_type=doc.mime_type, filename=doc.filename)
