"""Orquestra o processamento: extração → análise → persistência."""
import json

from sqlalchemy.orm import Session

from models.document import Document
from services.analyzer import analyze
from services.extraction import extract_text


def process_document(db: Session, documento: Document) -> None:
    """Processa um documento já salvo e atualiza seu registro no banco."""
    try:
        texto = extract_text(documento.file_path, documento.mime_type)
        resultado = analyze(texto)
        documento.doc_type = resultado.tipo
        documento.summary = resultado.resumo
        documento.analysis_json = json.dumps(
            resultado.model_dump(), ensure_ascii=False
        )
        documento.status = "done"
        documento.error = None
    except Exception as exc:  # noqa: BLE001 - registra erro no documento
        documento.status = "error"
        documento.error = str(exc)
    db.commit()
    db.refresh(documento)
