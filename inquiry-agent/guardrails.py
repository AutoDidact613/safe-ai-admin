import re

from graph_state import GuardrailResult, Inquiry

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"\b\d{2,3}[-\s]?\d{7}\b")

_OVERPROMISE_PHRASES = (
    "guaranteed",
    "100% guaranteed",
    "we promise",
    "money back guarantee",
)


def check_draft(draft: str, inquiry: Inquiry) -> GuardrailResult:
    reasons = []

    for email in _EMAIL_RE.findall(draft):
        if email not in inquiry.get("description", "") and email not in inquiry.get("title", ""):
            reasons.append(f"draft references an email address not present in the original inquiry: {email}")

    if _PHONE_RE.search(draft):
        reasons.append("draft contains what looks like a phone number")

    lowered = draft.lower()
    for phrase in _OVERPROMISE_PHRASES:
        if phrase in lowered:
            reasons.append(f"draft contains an unsupported promise: '{phrase}'")

    return {
        "inquiry_id": inquiry["id"],
        "passed": len(reasons) == 0,
        "reasons": reasons,
    }
