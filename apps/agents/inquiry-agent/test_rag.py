from unittest.mock import MagicMock, patch

from rag import ArticleRetriever, _cosine_similarity


def test_cosine_similarity_identical_vectors_is_one():
    assert _cosine_similarity([1.0, 0.0], [1.0, 0.0]) == 1.0


def test_cosine_similarity_orthogonal_vectors_is_zero():
    assert _cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0


def test_cosine_similarity_empty_vector_is_zero():
    assert _cosine_similarity([], []) == 0.0


@patch("rag.embed_text")
def test_find_relevant_returns_top_k_by_similarity(embed_text_mock):
    embed_text_mock.return_value = [1.0, 0.0]
    collection = MagicMock()
    collection.find.return_value = [
        {"title": "unrelated", "content": "...", "vector": [0.0, 1.0]},
        {"title": "exact match", "content": "...", "vector": [1.0, 0.0]},
    ]

    retriever = ArticleRetriever(collection, MagicMock())
    result = retriever.find_relevant("some query", top_k=1)

    assert len(result) == 1
    assert result[0]["title"] == "exact match"


@patch("rag.embed_text")
def test_find_relevant_returns_empty_list_when_no_articles(embed_text_mock):
    embed_text_mock.return_value = [1.0, 0.0]
    collection = MagicMock()
    collection.find.return_value = []

    retriever = ArticleRetriever(collection, MagicMock())
    result = retriever.find_relevant("some query")

    assert result == []
