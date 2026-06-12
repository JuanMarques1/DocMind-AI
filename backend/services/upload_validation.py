"""Validação de conteúdo de uploads por assinatura (magic bytes)."""

# Assinaturas conhecidas por extensão suportada.
_ASSINATURAS: dict[str, list[bytes]] = {
    "pdf": [b"%PDF-"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
}


def conteudo_corresponde(ext: str, conteudo: bytes) -> bool:
    """True se o início do conteúdo bate com alguma assinatura da extensão."""
    assinaturas = _ASSINATURAS.get(ext)
    if not assinaturas:
        return False
    return any(conteudo.startswith(a) for a in assinaturas)
