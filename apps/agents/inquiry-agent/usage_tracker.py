_tokens_by_thread = {}


def add_tokens(count: int, thread_id: str) -> None:
    _tokens_by_thread[thread_id] = _tokens_by_thread.get(thread_id, 0) + count


def get_total_tokens(thread_id: str) -> int:
    return _tokens_by_thread.get(thread_id, 0)


def reset() -> None:
    global _tokens_by_thread
    _tokens_by_thread = {}