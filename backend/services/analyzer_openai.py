"""Analisador via OpenAI usando JSON mode."""
import json

from openai import OpenAI

from config import settings
from schemas.document import AnalysisResult

PROMPT = (
    "Você é um extrator de informações de documentos. "
    "Analise o texto e responda APENAS com JSON no formato: "
    '{"tipo": str, "resumo": str, "informacoes": {chave: valor}}. '
    "tipo = categoria do documento (ex: Currículo, Nota Fiscal, Contrato). "
    "resumo = 1 a 2 frases. "
    "informacoes = dados importantes encontrados (nome, email, telefone, valores, datas, etc.). "
    "Responda sempre em português."
)


def analyze_openai(texto: str) -> AnalysisResult:
    """Envia o texto à OpenAI e retorna o resultado estruturado."""
    client = OpenAI(api_key=settings.openai_api_key)
    resposta = client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": PROMPT},
            {"role": "user", "content": texto[:12000]},
        ],
    )
    dados = json.loads(resposta.choices[0].message.content)
    return AnalysisResult(
        tipo=dados.get("tipo", "Documento"),
        resumo=dados.get("resumo", ""),
        informacoes=dados.get("informacoes", {}),
    )
