"""Seleciona o analisador conforme a disponibilidade da chave da OpenAI."""
from config import settings
from schemas.document import AnalysisResult
from services.analyzer_mock import analyze_mock


def analyze(texto: str) -> AnalysisResult:
    """Usa a OpenAI se houver chave; caso contrário, o analisador mock.

    Se a chamada à OpenAI falhar por qualquer motivo, faz fallback para o mock
    para garantir que o documento sempre receba uma análise.
    """
    if settings.openai_api_key:
        try:
            from services.analyzer_openai import analyze_openai

            return analyze_openai(texto)
        except Exception:  # noqa: BLE001 - fallback resiliente
            return analyze_mock(texto)
    return analyze_mock(texto)
