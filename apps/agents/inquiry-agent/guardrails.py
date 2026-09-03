import json
import re

from google import genai
from langsmith import traceable

from config import Config
from graph_state import GuardrailResult, Inquiry
from usage_tracker import add_tokens

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"\b\d{2,3}[-\s]?\d{7}\b")

_OVERPROMISE_PROMPT_TEMPLATE = """Does the following support reply make an unsupported guarantee or promise that a support team generally cannot back (e.g. guaranteeing a fix by a specific time, promising a refund, claiming certainty about outcomes outside the team's control)?

Respond with ONLY a JSON object: {{"overpromises": true/false, "reason": "short explanation or empty string"}}

Reply text:
{draft}
"""


@traceable
def _check_overpromise(draft: str, config: Config) -> dict:
    client = genai.Client(api_key=config.gemini_api_key)
    response = client.models.generate_content(
        model=config.llm_model,
        contents=_OVERPROMISE_PROMPT_TEMPLATE.format(draft=draft),
    )
    if response.usage_metadata:
        add_tokens(response.usage_metadata.total_token_count, config.thread_id)
    return json.loads(response.text)


def check_draft(draft: str, inquiry: Inquiry, config: Config) -> GuardrailResult:
    reasons = []

    for email in _EMAIL_RE.findall(draft):
        if email not in inquiry.get("description", "") and email not in inquiry.get("title", ""):
            reasons.append(f"draft references an email address not present in the original inquiry: {email}")

    if _PHONE_RE.search(draft):
        reasons.append("draft contains what looks like a phone number")

    # Skip the semantic Gemini check once the cheap regex checks already failed
    # the draft - no need to spend an LLM call on a draft that's already rejected.
    if not reasons:
        overpromise_result = _check_overpromise(draft, config)
        if overpromise_result.get("overpromises"):
            reason = overpromise_result.get("reason") or "draft makes an unsupported promise"
            reasons.append(f"draft contains an unsupported promise: {reason}")

    return {
        "inquiry_id": inquiry["id"],
        "passed": len(reasons) == 0,
        "reasons": reasons,
    }
