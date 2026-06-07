"""Testes da extração de texto."""
import fitz

from services.extraction import extract_pdf_text, extract_text


def _criar_pdf(caminho, texto):
    doc = fitz.open()
    pagina = doc.new_page()
    pagina.insert_text((72, 72), texto)
    doc.save(caminho)
    doc.close()


def test_extract_pdf_text_reads_content(tmp_path):
    pdf_path = tmp_path / "doc.pdf"
    _criar_pdf(str(pdf_path), "Relatorio de teste DocMind")

    texto = extract_pdf_text(str(pdf_path))
    assert "Relatorio de teste DocMind" in texto


def test_extract_text_dispatches_pdf(tmp_path):
    pdf_path = tmp_path / "d.pdf"
    _criar_pdf(str(pdf_path), "Conteudo PDF")

    assert "Conteudo PDF" in extract_text(str(pdf_path), "application/pdf")
