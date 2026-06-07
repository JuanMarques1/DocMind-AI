"""OCR de imagens usando Tesseract."""
from PIL import Image
import pytesseract


def extract_image_text(file_path: str) -> str:
    """Extrai texto de uma imagem via Tesseract (idiomas português + inglês)."""
    try:
        imagem = Image.open(file_path)
        return pytesseract.image_to_string(imagem, lang="por+eng").strip()
    except pytesseract.TesseractNotFoundError as exc:
        raise RuntimeError(
            "Tesseract OCR não encontrado. Instale o Tesseract no sistema "
            "ou execute o projeto via Docker (a imagem já o inclui)."
        ) from exc
