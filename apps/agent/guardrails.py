import re

from google import genai
from langsmith import traceable

from config import Config
from graph_state import GuardrailResult, Inquiry
from json_utils import parse_json_response
from usage_tracker import add_tokens

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"\b\d{2,3}[-\s]?\d{7}\b")

_OVERPROMISE_PROMPT_TEMPLATE = """Does the following support reply make an unsupported guarantee or promise that a support team generally cannot back (e.g. guaranteeing a fix by a specific time, promising a refund, claiming certainty about outcomes outside the team's control)?

Respond with ONLY a JSON object: {{"overpromises": true/false, "reason": "short explanation or empty string"}}

Reply text:
{draft}
"""

_RELEVANCE_PROMPT_TEMPLATE = """Does the following support reply include information the customer did not ask for and that is not relevant to their inquiry (e.g. unsolicited step-by-step instructions for an unrelated topic, such as explaining password reset when the customer only said thank you)?

Customer inquiry:
{inquiry}

Reply text:
{draft}

Respond with ONLY a JSON object: {{"irrelevant": true/false, "reason": "short explanation or empty string"}}
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
    return parse_json_response(response.text)


@traceable
def _check_relevance(draft: str, inquiry_text: str, config: Config) -> dict:
    client = genai.Client(api_key=config.gemini_api_key)
    response = client.models.generate_content(
        model=config.llm_model,
        contents=_RELEVANCE_PROMPT_TEMPLATE.format(inquiry=inquiry_text, draft=draft),
    )
    if response.usage_metadata:
        add_tokens(response.usage_metadata.total_token_count, config.thread_id)
    return parse_json_response(response.text)


def check_draft(draft: str, inquiry: Inquiry, config: Config) -> GuardrailResult:
    reasons = []

    for email in _EMAIL_RE.findall(draft):
        if email not in inquiry.get("description", "") and email not in inquiry.get("title", ""):
            reasons.append(f"draft references an email address not present in the original inquiry: {email}")

    if _PHONE_RE.search(draft):
        reasons.append("draft contains what looks like a phone number")

    # Skip the semantic Gemini checks once the cheap regex checks already failed
    # the draft - no need to spend an LLM call on a draft that's already rejected.
    if not reasons:
        overpromise_result = _check_overpromise(draft, config)
        if overpromise_result.get("overpromises"):
            reason = overpromise_result.get("reason") or "draft makes an unsupported promise"
            reasons.append(f"draft contains an unsupported promise: {reason}")

    # Same skip logic applies here - no need for a second LLM call once the
    # draft already failed on overpromise.
    if not reasons:
        inquiry_text = f"{inquiry.get('title', '')}\n{inquiry.get('description', '')}".strip()
        relevance_result = _check_relevance(draft, inquiry_text, config)
        if relevance_result.get("irrelevant"):
            reason = relevance_result.get("reason") or "draft includes information unrelated to the inquiry"
            reasons.append(f"draft includes unrequested, irrelevant information: {reason}")

    return {
        "inquiry_id": inquiry["id"],
        "passed": len(reasons) == 0,
        "reasons": reasons,
    }
