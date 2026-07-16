from guardrails import check_draft


def _inquiry(inquiry_id="1", title="foo", description="bar"):
    return {"id": inquiry_id, "title": title, "description": description}


def test_passes_when_no_issues():
    result = check_draft("Thank you for reaching out, we will look into it.", _inquiry())
    assert result["passed"] is True
    assert result["reasons"] == []


def test_flags_unrelated_email_address():
    draft = "Please contact other.user@example.com for more information."
    result = check_draft(draft, _inquiry())
    assert result["passed"] is False
    assert any("email" in reason for reason in result["reasons"])


def test_flags_overpromise_phrase():
    draft = "This is 100% guaranteed to be fixed by tomorrow."
    result = check_draft(draft, _inquiry())
    assert result["passed"] is False
    assert any("unsupported promise" in reason for reason in result["reasons"])
