from json_utils import parse_json_response


def test_parses_plain_json():
    assert parse_json_response('{"a": 1}') == {"a": 1}


def test_parses_json_wrapped_in_code_fence():
    text = '```json\n{"a": 1}\n```'
    assert parse_json_response(text) == {"a": 1}


def test_parses_json_wrapped_in_bare_code_fence():
    text = '```\n{"a": 1}\n```'
    assert parse_json_response(text) == {"a": 1}
