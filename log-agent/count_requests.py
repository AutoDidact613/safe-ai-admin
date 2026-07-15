def count_by_request_type(records: list[dict]) -> dict[str, int]:
    """
    Counts how many records exist per requestType.

    Example:
        Input:  [{"requestType": "bug"}, {"requestType": "bug"}, {"requestType": "feature_request"}]
        Output: {"bug": 2, "feature_request": 1}
    """
    counts: dict[str, int] = {}

    for record in records:
        request_type = record.get("requestType", "unknown")
        counts[request_type] = counts.get(request_type, 0) + 1

    return counts


if __name__ == "__main__":
    sample_records = [
        {"requestType": "bug"},
        {"requestType": "bug"},
        {"requestType": "feature_request"},
        {"requestType": "general_feedback"},
    ]
    print(count_by_request_type(sample_records))
 