from config import Config
from embeddings import embed_text

_DEFAULT_TOP_K = 3


def _cosine_similarity(a: list, b: list) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5

    denominator = norm_a * norm_b
    return dot / denominator if denominator else 0.0


class ArticleRetriever:
    def __init__(self, collection, config: Config):
        self._collection = collection
        self._config = config

    def find_relevant(self, query_text: str, top_k: int = _DEFAULT_TOP_K) -> list:
        query_vector = embed_text(query_text, self._config)
        scored = [
            (_cosine_similarity(query_vector, doc["vector"]), doc)
            for doc in self._collection.find({}, {"title": 1, "content": 1, "vector": 1})
        ]
        scored.sort(key=lambda pair: pair[0], reverse=True)
        return [doc for _, doc in scored[:top_k]]
