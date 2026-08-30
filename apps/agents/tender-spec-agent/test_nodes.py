from unittest.mock import MagicMock, patch

from nodes import research_node, save_node, spec_document_node


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
