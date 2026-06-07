"""Extração de texto de documentos (PDF e imagens)."""
import fitz  # PyMuPDF


def extract_pdf_text(file_path: str) -> str:
    """Extrai todo o texto de um PDF usando PyMuPDF."""
    texto_paginas = []
    with fitz.open(file_path) as doc:
        for pagina in doc:
            texto_paginas.append(pagina.get_text())
    return "\n".join(texto_paginas).strip()


def extract_text(file_path: str, mime_type: str) -> str:
    """Escolhe o extrator adequado conforme o mime type do arquivo."""
    if mime_type == "application/pdf":
        return extract_pdf_text(file_path)
    # Imagens (png/jpg/jpeg) seguem para o OCR.
    from services.ocr import extract_image_text

    return extract_image_text(file_path)
