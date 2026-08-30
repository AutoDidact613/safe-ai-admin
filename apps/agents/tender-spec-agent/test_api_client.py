from unittest.mock import MagicMock, patch

from api_client import SafeAIClient


def _config():
    config = MagicMock()
    config.safeai_api_base_url = "http://localhost:3001"
    config.safeai_agent_api_token = "test-token"
    return config


@patch("api_client.requests.Session")
def test_fetch_tender_context_calls_expected_url(session_cls):
    session = session_cls.return_value
    session.get.return_value.json.return_value = {"id": "1", "title": "foo"}

    client = SafeAIClient(_config())
    result = client.fetch_tender_context("1")

    session.get.assert_called_once_with("http://localhost:3001/tender-board/1/agent-context")
    assert result == {"id": "1", "title": "foo"}


@patch("api_client.requests.Session")
def test_save_specification_sends_payload(session_cls):
    session = session_cls.return_value

    client = SafeAIClient(_config())
    client.save_specification("1", {"status": "ready", "document": "foo"})

    session.post.assert_called_once_with(
        "http://localhost:3001/tender-board/1/specification",
        json={"status": "ready", "document": "foo"},
    )
