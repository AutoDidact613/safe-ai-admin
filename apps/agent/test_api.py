from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import api
from api import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _mock_mongo_client():
    # _get_mongo_client() בונה MongoClient אמיתי מ-config.mongodb_atlas_uri -
    # ב-unit tests ה-load_config מזויף ואין URI תקין, אז בלי המוק הזה
    # pymongo היה זורק ConfigurationError. מאפסים גם את הסינגלטון המודולרי
    # לפני ואחרי כל בדיקה כדי שבדיקות לא יזהמו אחת את השנייה עם client מקובע.
    api._mongo_client = None
    with patch("api.MongoClient"):
        yield
    api._mongo_client = None


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


@patch("api.resume_with_selection")
@patch("api.build_graph")
@patch("api.SafeAIClient")
@patch("api.load_config")
def test_run_process_returns_drafts(load_config_mock, client_cls, build_graph_mock, resume_mock):
    build_graph_mock.return_value = MagicMock()
    resume_mock.return_value = {
        "1": {"text": "draft text", "guardrails_passed": True, "guardrails_reasons": []}
    }

    response = client.post("/run/process", json={"thread_id": "t1", "ids": ["1"]})

    assert response.status_code == 200
    body = response.json()
    assert body["thread_id"] == "t1"
    assert body["drafts"] == [
        {
            "inquiry_id": "1",
            "text": "draft text",
            "guardrails_passed": True,
            "guardrails_reasons": [],
        }
    ]
    resume_mock.assert_called_once_with(
        build_graph_mock.return_value, {"configurable": {"thread_id": "t1"}}, ["1"]
    )


@patch("api.resume_with_selection")
@patch("api.build_graph")
@patch("api.SafeAIClient")
@patch("api.load_config")
def test_run_process_maps_graph_state_error_to_409(
    load_config_mock, client_cls, build_graph_mock, resume_mock
):
    from agent_ops import GraphStateError

    resume_mock.side_effect = GraphStateError("This run is not waiting for inquiry selection (gate 1)")

    response = client.post("/run/process", json={"thread_id": "t1", "ids": ["1"]})

    assert response.status_code == 409


@patch("api.edit_draft")
@patch("api.build_graph")
@patch("api.SafeAIClient")
@patch("api.load_config")
def test_run_edit_returns_updated_draft(load_config_mock, client_cls, build_graph_mock, edit_mock):
    build_graph_mock.return_value = MagicMock()
    edit_mock.return_value = {"inquiry_id": "1", "text": "new text"}

    response = client.post(
        "/run/edit", json={"thread_id": "t1", "inquiry_id": "1", "text": "new text"}
    )

    assert response.status_code == 200
    assert response.json() == {"thread_id": "t1", "inquiry_id": "1", "text": "new text"}


@patch("api.edit_draft")
@patch("api.build_graph")
@patch("api.SafeAIClient")
@patch("api.load_config")
def test_run_edit_maps_graph_state_error_to_409(
    load_config_mock, client_cls, build_graph_mock, edit_mock
):
    from agent_ops import GraphStateError

    edit_mock.side_effect = GraphStateError("This run is not waiting for approval (gate 3)")

    response = client.post("/run/edit", json={"thread_id": "t1", "inquiry_id": "1", "text": "x"})

    assert response.status_code == 409


@patch("api.resume_with_approval")
@patch("api.build_graph")
@patch("api.SafeAIClient")
@patch("api.load_config")
def test_run_approve_returns_sent_ids(load_config_mock, client_cls, build_graph_mock, approve_mock):
    build_graph_mock.return_value = MagicMock()
    approve_mock.return_value = {"sent_ids": ["1", "2"]}

    response = client.post("/run/approve", json={"thread_id": "t1", "ids": ["1", "2"]})

    assert response.status_code == 200
    assert response.json() == {"thread_id": "t1", "sent_ids": ["1", "2"]}


@patch("api.resume_with_approval")
@patch("api.build_graph")
@patch("api.SafeAIClient")
@patch("api.load_config")
def test_run_approve_maps_graph_state_error_to_409(
    load_config_mock, client_cls, build_graph_mock, approve_mock
):
    from agent_ops import GraphStateError

    approve_mock.side_effect = GraphStateError("This run is not waiting for approval (gate 3)")

    response = client.post("/run/approve", json={"thread_id": "t1", "ids": ["1"]})

    assert response.status_code == 409
