from unittest.mock import MagicMock, patch

from api_client import SafeAIClient


def _config():
    config = MagicMock()
    config.safeai_api_base_url = "http://localhost:5000/api"
    config.safeai_agent_api_token = "test-token"
    return config


@patch("api_client.requests.Session")
def test_fetch_open_inquiries_calls_expected_url(session_cls):
    session = session_cls.return_value
    session.get.return_value.json.return_value = [
        {"_id": "1", "title": "foo", "description": "bar", "status": "open"}
    ]

    client = SafeAIClient(_config())
    result = client.fetch_open_inquiries()

    session.get.assert_called_once_with("http://localhost:5000/api/contact/all")
    assert result == [{"id": "1", "title": "foo", "description": "bar"}]


@patch("api_client.requests.Session")
def test_fetch_open_inquiries_filters_out_closed(session_cls):
    # /contact/all returns every request regardless of status (no server-side filter
    # or ?status= param exists) - the agent must filter client-side.
    session = session_cls.return_value
    session.get.return_value.json.return_value = [
        {"_id": "1", "title": "foo", "description": "bar", "status": "open"},
        {"_id": "2", "title": "baz", "description": "qux", "status": "closed"},
    ]

    client = SafeAIClient(_config())
    result = client.fetch_open_inquiries()

    assert [inquiry["id"] for inquiry in result] == ["1"]


@patch("api_client.requests.Session")
def test_post_reply_sends_text_payload(session_cls):
    session = session_cls.return_value

    client = SafeAIClient(_config())
    client.post_reply("1", "hello")

    session.post.assert_called_once_with(
        "http://localhost:5000/api/contact/my-requests/1/reply",
        json={"text": "hello"},
    )


@patch("api_client.requests.Session")
def test_get_inquiry_details_calls_expected_url(session_cls):
    session = session_cls.return_value
    session.get.return_value.json.return_value = {
        "_id": "1",
        "title": "foo",
        "description": "bar",
        "status": "open",
        "requestType": "baz",
        "replies": [],
    }

    client = SafeAIClient(_config())
    result = client.get_inquiry_details("1")

    session.get.assert_called_once_with("http://localhost:5000/api/contact/my-requests/1")
    assert result["status"] == "open"
    assert result["replies"] == []
