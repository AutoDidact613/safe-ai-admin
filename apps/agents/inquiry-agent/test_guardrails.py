from unittest.mock import MagicMock, patch

from guardrails import check_draft


def _inquiry(inquiry_id="1", title="foo", description="bar"):
    return {"id": inquiry_id, "title": title, "description": description}


def _config():
    config = MagicMock()
    config.gemini_api_key = "test-key"
    config.llm_model = "gemini-1.5-pro"
    return config


@patch("guardrails.genai.Client")
def test_passes_when_no_issues(client_cls):
    client_cls.return_value.models.generate_content.return_value.text = (
        '{"overpromises": false, "reason": ""}'
    )

    result = check_draft("Thank you for reaching out, we will look into it.", _inquiry(), _config())

    assert result["passed"] is True
    assert result["reasons"] == []


def test_flags_unrelated_email_address():
    draft = "Please contact other.user@example.com for more information."

    result = check_draft(draft, _inquiry(), _config())

    assert result["passed"] is False
    assert any("email" in reason for reason in result["reasons"])


@patch("guardrails.genai.Client")
def test_passes_when_no_issues_with_code_fenced_response(client_cls):
    client_cls.return_value.models.generate_content.return_value.text = (
        '```json\n{"overpromises": false, "reason": ""}\n```'
    )

    result = check_draft("Thank you for reaching out, we will look into it.", _inquiry(), _config())

    assert result["passed"] is True


@patch("guardrails.genai.Client")
def test_flags_overpromise_via_semantic_check(client_cls):
    client_cls.return_value.models.generate_content.return_value.text = (
        '{"overpromises": true, "reason": "guarantees a same-day fix"}'
    )

    result = check_draft("This will definitely be fixed today, guaranteed.", _inquiry(), _config())

    assert result["passed"] is False
    assert any("unsupported promise" in reason for reason in result["reasons"])


@patch("guardrails.genai.Client")
def test_flags_irrelevant_content_via_semantic_check(client_cls):
    responses = [
        MagicMock(text='{"overpromises": false, "reason": ""}'),
        MagicMock(text='{"irrelevant": true, "reason": "explains password reset, unrelated to a thank-you note"}'),
    ]
    client_cls.return_value.models.generate_content.side_effect = responses

    inquiry = _inquiry(title="Thanks", description="Just wanted to say thank you!")
    draft = "You're welcome! By the way, to reset your password, go to the login screen..."
    result = check_draft(draft, inquiry, _config())

    assert result["passed"] is False
    assert any("unrequested, irrelevant information" in reason for reason in result["reasons"])
