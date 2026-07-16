from unittest.mock import MagicMock, patch

from classify import classify_inquiry


def _config():
    config = MagicMock()
    config.gemini_api_key = "test-key"
    config.llm_model = "gemini-1.5-pro"
    return config


@patch("classify.genai.Client")
def test_classify_inquiry_parses_valid_json(client_cls):
    client_cls.return_value.models.generate_content.return_value.text = (
        '{"category": "bug", "urgency": "urgent"}'
    )

    result = classify_inquiry("the app crashes on login", _config())

    assert result == {"category": "bug", "urgency": "urgent"}


@patch("classify.genai.Client")
def test_classify_inquiry_rejects_unknown_values(client_cls):
    client_cls.return_value.models.generate_content.return_value.text = (
        '{"category": "nonsense", "urgency": "urgent"}'
    )

    try:
        classify_inquiry("some inquiry", _config())
        assert False, "expected ValueError"
    except ValueError:
        pass
