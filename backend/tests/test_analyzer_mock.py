"""Testes do analisador heurístico (mock)."""
from services.analyzer_mock import analyze_mock


def test_mock_detecta_email_e_telefone():
    texto = "Joao Silva\njoao@email.com\n(11) 99999-9999\nDesenvolvedor de software"
    r = analyze_mock(texto)
    assert r.informacoes.get("email") == "joao@email.com"
    assert "99999-9999" in r.informacoes.get("telefone", "")
    assert r.tipo
    assert r.resumo


def test_mock_classifica_curriculo():
    texto = "Currículo\nExperiência profissional\nFormação acadêmica"
    assert analyze_mock(texto).tipo == "Currículo"
