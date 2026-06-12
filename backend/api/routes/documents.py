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
from services.upload_validation import conteudo_corresponde

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

    if not conteudo:
        raise HTTPException(400, "Arquivo vazio.")
    if not conteudo_corresponde(ext, conteudo):
        raise HTTPException(
            400, f"O conteúdo do arquivo não corresponde à extensão .{ext}."
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
