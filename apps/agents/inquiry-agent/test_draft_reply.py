from unittest.mock import MagicMock, patch

from draft_reply import generate_draft


def _inquiry(title="foo", description="bar"):
    return {"id": "1", "title": title, "description": description}


def _config():
    config = MagicMock()
    config.gemini_api_key = "test-key"
    config.llm_model = "gemini-1.5-pro"
    return config


@patch("draft_reply.genai.Client")
def test_generate_draft_without_articles(client_cls):
    client_cls.return_value.models.generate_content.return_value.text = "a draft reply"

    result = generate_draft(_inquiry(), "bug", [], _config())

    assert result == "a draft reply"
    prompt = client_cls.return_value.models.generate_content.call_args.kwargs["contents"]
    assert "help articles" not in prompt.lower()


@patch("draft_reply.genai.Client")
def test_generate_draft_includes_relevant_articles(client_cls):
    client_cls.return_value.models.generate_content.return_value.text = "a draft reply"
    articles = [{"title": "how to reset your password", "content": "go to settings..."}]

    generate_draft(_inquiry(), "bug", articles, _config())

    prompt = client_cls.return_value.models.generate_content.call_args.kwargs["contents"]
    assert "how to reset your password" in prompt
    assert "go to settings..." in prompt
