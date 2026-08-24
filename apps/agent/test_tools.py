from unittest.mock import MagicMock

from tools import make_tools


def _client():
    client = MagicMock()
    client.get_inquiry_details.return_value = {
        "_id": "1",
        "status": "open",
        "requestType": "baz",
        "replies": [],
    }
    return client


def test_get_inquiry_details_returns_client_data():
    client = _client()
    tools = make_tools(client)
    get_inquiry_details = next(t for t in tools if t.name == "get_inquiry_details")

    result = get_inquiry_details.invoke({"inquiry_id": "1"})

    client.get_inquiry_details.assert_called_once_with("1")
    assert result == {"_id": "1", "status": "open", "requestType": "baz", "replies": []}


def test_get_inquiry_details_is_a_langchain_tool():
    tools = make_tools(_client())
    get_inquiry_details = next(t for t in tools if t.name == "get_inquiry_details")

    assert get_inquiry_details.description
    assert callable(get_inquiry_details.invoke)
