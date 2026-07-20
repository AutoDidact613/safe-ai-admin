import json

from google import genai
from langsmith import traceable

from config import Config
from graph_state import Classification

_VALID_CATEGORIES = {"bug", "feature", "feedback"}
_VALID_URGENCIES = {"urgent", "normal", "low"}

_PROMPT_TEMPLATE = """Classify the following user support inquiry.
Respond with ONLY a JSON object of the form {{"category": "...", "urgency": "..."}}.
category must be one of: bug, feature, feedback.
urgency must be one of: urgent, normal, low.

Inquiry:
{text}
"""


@traceable
def _call_gemini(prompt: str, config: Config) -> str:
    client = genai.Client(api_key=config.gemini_api_key)
    response = client.models.generate_content(model=config.llm_model, contents=prompt)
    return response.text


def classify_inquiry(text: str, config: Config) -> Classification:
    raw = _call_gemini(_PROMPT_TEMPLATE.format(text=text), config)
    data = json.loads(raw)

    category = data.get("category")
    urgency = data.get("urgency")
    if category not in _VALID_CATEGORIES or urgency not in _VALID_URGENCIES:
        raise ValueError(f"Unexpected classification result: {data}")

    return {"category": category, "urgency": urgency}
