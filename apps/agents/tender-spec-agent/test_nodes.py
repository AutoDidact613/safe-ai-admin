from unittest.mock import MagicMock, patch

import pytest
from google.genai import errors as genai_errors

from nodes import _generate_tech_stack_content, research_node, save_node, spec_document_node, tech_stack_node


def _base_state():
    return {
        "tender_id": "1",
        "tender": {
            "title": "foo",
            "shortDescription": "bar baz",
            "productType": "אפליקציה",
            "aiApplicationType": "צאטבוט",
            "additionalDetails": "qux",
        },
        "tech_stack": {"recommendation": "foo/bar", "reasoning": "baz"},
        "open_source_references": [{"title": "foo", "url": "https://example.com/foo", "description": "bar"}],
        "reading_sources": [],
    }


def test_spec_document_node_includes_tech_stack_and_references():
    state = spec_document_node(_base_state())

    assert "foo/bar" in state["document"]
    assert "https://example.com/foo" in state["document"]


def test_save_node_marks_ready_without_research_failure():
    client = MagicMock()
    state = {**_base_state(), "document": "foo doc", "research_failed": False}

    result = save_node(state, client)

    saved_specification = client.save_specification.call_args.args[1]
    assert saved_specification["status"] == "ready"
    assert "errorMessage" not in saved_specification
    assert result["status"] == "ready"


def test_save_node_notes_partial_research_failure_but_stays_ready():
    client = MagicMock()
    state = {**_base_state(), "document": "foo doc", "research_failed": True}

    save_node(state, client)

    saved_specification = client.save_specification.call_args.args[1]
    assert saved_specification["status"] == "ready"
    assert "errorMessage" in saved_specification


def _google_response(items):
    response = MagicMock()
    response.json.return_value = {"items": items}
    return response


@patch("nodes.requests.get")
def test_research_node_maps_google_results_to_references(mock_get):
    agent_config = MagicMock(google_search_api_key="key", google_search_engine_id="cx")
    mock_get.side_effect = [
        _google_response([{"title": "foo repo", "link": "https://github.com/foo/bar", "snippet": "bar"}]),
        _google_response([{"title": "foo article", "link": "https://dev.to/foo", "snippet": "baz"}]),
    ]

    state = research_node(_base_state(), agent_config)

    assert state["open_source_references"] == [
        {"title": "foo repo", "url": "https://github.com/foo/bar", "description": "bar"}
    ]
    assert state["reading_sources"] == [
        {"title": "foo article", "url": "https://dev.to/foo", "description": "baz"}
    ]
    assert state["research_failed"] is False
    assert mock_get.call_count == 2


@patch("nodes.requests.get")
def test_research_node_survives_a_failed_search(mock_get):
    agent_config = MagicMock(google_search_api_key="key", google_search_engine_id="cx")
    mock_get.side_effect = [
        Exception("timeout"),
        _google_response([{"title": "foo article", "link": "https://dev.to/foo", "snippet": "baz"}]),
    ]

    state = research_node(_base_state(), agent_config)

    assert state["open_source_references"] == []
    assert state["reading_sources"] == [
        {"title": "foo article", "url": "https://dev.to/foo", "description": "baz"}
    ]
    assert state["research_failed"] is True


def _server_error(code=503, status="UNAVAILABLE"):
    return genai_errors.ServerError(code, {"error": {"message": "high demand", "status": status, "code": code}})


def _client_error(code, status):
    return genai_errors.ClientError(code, {"error": {"message": "bad request", "status": status, "code": code}})


def _gemini_response(payload: str):
    response = MagicMock()
    response.text = payload
    return response


@pytest.fixture(autouse=True)
def _no_retry_sleep():
    # ה-retry על tech_stack_node משתמש ב-exponential backoff אמיתי (2-20 שניות) -
    # מבטלים את השינה בפועל כדי שהטסטים שממצים ניסיונות לא ייקחו עשרות שניות.
    original_sleep = _generate_tech_stack_content.retry.sleep
    _generate_tech_stack_content.retry.sleep = lambda _: None
    yield
    _generate_tech_stack_content.retry.sleep = original_sleep


@patch("nodes.genai.Client")
def test_tech_stack_node_retries_a_transient_server_error_then_succeeds(mock_client_cls):
    mock_client = mock_client_cls.return_value
    mock_client.models.generate_content.side_effect = [
        _server_error(),
        _gemini_response('{"recommendation": "Next.js", "reasoning": "foo"}'),
    ]
    agent_config = MagicMock(gemini_api_key="key", llm_model="gemini-flash-latest")

    state = tech_stack_node(_base_state(), agent_config)

    assert state["tech_stack"]["recommendation"] == "Next.js"
    assert mock_client.models.generate_content.call_count == 2


@patch("nodes.genai.Client")
def test_tech_stack_node_retries_a_429_rate_limit(mock_client_cls):
    mock_client = mock_client_cls.return_value
    mock_client.models.generate_content.side_effect = [
        _client_error(429, "RESOURCE_EXHAUSTED"),
        _gemini_response('{"recommendation": "Next.js", "reasoning": "foo"}'),
    ]
    agent_config = MagicMock(gemini_api_key="key", llm_model="gemini-flash-latest")

    state = tech_stack_node(_base_state(), agent_config)

    assert state["tech_stack"]["recommendation"] == "Next.js"
    assert mock_client.models.generate_content.call_count == 2


@patch("nodes.genai.Client")
def test_tech_stack_node_does_not_retry_a_non_transient_error(mock_client_cls):
    mock_client = mock_client_cls.return_value
    mock_client.models.generate_content.side_effect = _client_error(400, "INVALID_ARGUMENT")
    agent_config = MagicMock(gemini_api_key="key", llm_model="gemini-flash-latest")

    with pytest.raises(genai_errors.ClientError):
        tech_stack_node(_base_state(), agent_config)

    assert mock_client.models.generate_content.call_count == 1


@patch("nodes.genai.Client")
def test_tech_stack_node_reraises_after_exhausting_retries(mock_client_cls):
    mock_client = mock_client_cls.return_value
    mock_client.models.generate_content.side_effect = _server_error()
    agent_config = MagicMock(gemini_api_key="key", llm_model="gemini-flash-latest")

    with pytest.raises(genai_errors.ServerError):
        tech_stack_node(_base_state(), agent_config)

    assert mock_client.models.generate_content.call_count == 4
