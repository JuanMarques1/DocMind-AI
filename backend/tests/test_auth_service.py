"""Testes unitários do serviço de autenticação."""
import pytest

from services import auth


def test_hash_e_verificacao_de_senha():
    h = auth.hash_password("senha123")
    assert h != "senha123"
    assert auth.verify_password("senha123", h) is True
    assert auth.verify_password("errada", h) is False


def test_token_round_trip():
    token = auth.create_access_token(user_id=42)
    assert auth.decode_token(token) == 42


def test_token_invalido_retorna_none():
    assert auth.decode_token("nao-e-um-token") is None
