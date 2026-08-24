from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from api import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch("api.build_graph")
@patch("api.SafeAIClient")
@patch("api.load_config")
def test_run_list_returns_inquiries_with_urgency(load_config_mock, client_cls, build_graph_mock):
    graph = MagicMock()
    graph.invoke.return_value = {
        "inquiries": [{"id": "1", "title": "foo", "description": "bar"}],
        "classified": {"1": {"category": "bug", "urgency": "urgent"}},
    }
    build_graph_mock.return_value = graph

    response = client.post("/run/list")

    assert response.status_code == 200
    body = response.json()
    assert body["inquiries"] == [
        {"id": "1", "title": "foo", "description": "bar", "urgency": "urgent"}
    ]
    assert "thread_id" in body


@patch("api.build_graph")
@patch("api.SafeAIClient")
@patch("api.load_config")
def test_run_list_maps_config_error_to_500(load_config_mock, client_cls, build_graph_mock):
    from config import ConfigError

    load_config_mock.side_effect = ConfigError("Missing required environment variable: X")

    response = client.post("/run/list")

    assert response.status_code == 500
