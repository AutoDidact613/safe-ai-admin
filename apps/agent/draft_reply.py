from google import genai
from langsmith import traceable

from config import Config
from graph_state import Inquiry
from usage_tracker import add_tokens

_PROMPT_TEMPLATE = """Write a helpful, professional reply to the following user support
inquiry (category: {category}). Do not reveal information about other users, and do not
promise anything the support team cannot guarantee.

Only address what the customer actually wrote. Do not add unsolicited instructions,
explanations, or tips about unrelated topics (for example, do not explain how to reset a
password just because it might be generally useful) unless the inquiry itself is about that
topic. If the inquiry is a simple thank-you or a short comment, a short, matching reply is
enough - it does not need padding.

Title: {title}
Description: {description}
{articles_section}"""

_ARTICLES_SECTION_TEMPLATE = """
Ground your reply in the following help articles when they are relevant. Do not state
anything beyond what they and the inquiry itself support.

{articles}
"""


@traceable
def _call_gemini(prompt: str, config: Config) -> str:
    client = genai.Client(api_key=config.gemini_api_key)
    response = client.models.generate_content(model=config.llm_model, contents=prompt)
    if response.usage_metadata:
        add_tokens(response.usage_metadata.total_token_count, config.thread_id)
    return response.text


def _format_articles_section(articles: list) -> str:
    if not articles:
        return ""

    articles_text = "\n\n".join(
        f"Title: {article['title']}\n{article['content']}" for article in articles
    )
    return _ARTICLES_SECTION_TEMPLATE.format(articles=articles_text)


def generate_draft(inquiry: Inquiry, category: str, articles: list, config: Config) -> str:
    prompt = _PROMPT_TEMPLATE.format(
        category=category,
        title=inquiry["title"],
        description=inquiry["description"],
        articles_section=_format_articles_section(articles),
    )
    return _call_gemini(prompt, config)
