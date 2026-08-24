from count_requests import count_by_request_type


def test_count_by_request_type_known_result():
    sample_records = [
        {"requestType": "bug"},
        {"requestType": "bug"},
        {"requestType": "feature_request"},
        {"requestType": "general_feedback"},
    ]

    result = count_by_request_type(sample_records)

    assert result == {
        "bug": 2,
        "feature_request": 1,
        "general_feedback": 1,
    }


def test_count_by_request_type_missing_type_falls_back_to_unknown():
    sample_records = [
        {"requestType": "bug"},
        {},  # record with no requestType at all
    ]

    result = count_by_request_type(sample_records)

    assert result == {
        "bug": 1,
        "unknown": 1,
    }


def test_count_by_request_type_empty_list():
    result = count_by_request_type([])
    assert result == {}