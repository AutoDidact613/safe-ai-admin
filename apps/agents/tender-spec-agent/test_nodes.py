from unittest.mock import MagicMock

from nodes import save_node, spec_document_node


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
