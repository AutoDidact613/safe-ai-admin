from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from embeddings import embed_text


def _config():
    config = MagicMock()
    config.gemini_api_key = "test-key"
    config.gemini_embedding_model = "gemini-embedding-001"
    return config


@patch("embeddings.genai.Client")
def test_embed_text_returns_vector_values(client_cls):
    client_cls.return_value.models.embed_content.return_value = SimpleNamespace(
        embeddings=[SimpleNamespace(values=[0.1, 0.2, 0.3])]
    )

    result = embed_text("some inquiry description", _config())

    assert result == [0.1, 0.2, 0.3]
    client_cls.return_value.models.embed_content.assert_called_once_with(
        model="gemini-embedding-001", contents="some inquiry description"
    )
