"""Analisador heurístico de fallback (usado quando não há chave da OpenAI)."""
import re

from schemas.document import AnalysisResult

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
TEL_RE = re.compile(r"\(?\d{2}\)?\s?\d{4,5}-?\d{4}")


def _detecta_tipo(texto: str) -> str:
    """Classifica o documento por palavras-chave simples."""
    t = texto.lower()
    if any(p in t for p in ("currículo", "curriculo", "experiência", "formação")):
        return "Currículo"
    if any(p in t for p in ("nota fiscal", "cnpj", "valor total", "fatura")):
        return "Nota Fiscal"
    if "contrato" in t:
        return "Contrato"
    return "Documento"


def analyze_mock(texto: str) -> AnalysisResult:
    """Extrai informações básicas por expressões regulares."""
    informacoes: dict[str, object] = {}

    if m := EMAIL_RE.search(texto):
        informacoes["email"] = m.group(0)
    if m := TEL_RE.search(texto):
        informacoes["telefone"] = m.group(0)

    linhas = [linha.strip() for linha in texto.splitlines() if linha.strip()]
    if linhas:
        informacoes["nome"] = linhas[0]

    tipo = _detecta_tipo(texto)
    resumo = (
        (texto[:200] + "...")
        if len(texto) > 200
        else (texto or "Documento sem texto extraível.")
    )
    return AnalysisResult(tipo=tipo, resumo=resumo, informacoes=informacoes)
