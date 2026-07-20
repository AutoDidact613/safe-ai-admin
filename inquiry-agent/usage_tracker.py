_total_tokens = 0


def add_tokens(count: int) -> None:
    global _total_tokens
    _total_tokens += count


def get_total_tokens() -> int:
    return _total_tokens


def reset() -> None:
    global _total_tokens
    _total_tokens = 0