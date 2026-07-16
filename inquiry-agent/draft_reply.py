from google import genai

from config import Config
from graph_state import Inquiry

_PROMPT_TEMPLATE = """Write a helpful, professional reply to the following user support
inquiry (category: {category}). Do not reveal information about other users, and do not
promise anything the support team cannot guarantee.

Title: {title}
Description: {description}
"""


def _call_gemini(prompt: str, config: Config) -> str:
    client = genai.Client(api_key=config.gemini_api_key)
    response = client.models.generate_content(model=config.llm_model, contents=prompt)
    return response.text


def generate_draft(inquiry: Inquiry, category: str, config: Config) -> str:
    prompt = _PROMPT_TEMPLATE.format(
        category=category,
        title=inquiry["title"],
        description=inquiry["description"],
    )
    return _call_gemini(prompt, config)
