import json

import requests
from google import genai

from api_client import SafeAIClient
from config import Config
from graph_state import GraphState

_GOOGLE_SEARCH_ENDPOINT = "https://www.googleapis.com/customsearch/v1"

# הענן/חשבון Google של SafeAI-613 לא מאפשר "Search the entire web" על ה-Programmable
# Search Engine (מוגבל לחשבונות ישנים בלבד) - הפתרון: ה-CSE מוגדר לחפש רק ברשימת
# אתרים קבועה (ראו .env.example), ואנחנו מפצלים בין קטגוריית open-source לקריאה
# ע"י תוספת site: לשאילתה עצמה, לא ע"י "Search the entire web".
_OPEN_SOURCE_SITES = "(site:github.com OR site:gitlab.com)"
_READING_SITES = "(site:stackoverflow.com OR site:dev.to OR site:medium.com OR site:freecodecamp.org)"


_TECH_STACK_PROMPT = """אתה יועץ טכני. קיבלת תיאור של מכרז לפיתוח תוכנה/AI.
החזר JSON בלבד (ללא markdown, ללא הסבר נוסף) בצורה:
{{"recommendation": "שפה/framework מומלצים בשורה אחת", "reasoning": "נימוק קצר, עד 3 משפטים"}}

פרטי המכרז:
כותרת: {title}
תיאור: {short_description}
סוג מוצר: {product_type}
צורת שימוש ב-AI: {ai_application_type}
פרטים נוספים: {additional_details}
"""


def fetch_node(state: GraphState, client: SafeAIClient) -> GraphState:
    print(f"שולף נתוני מכרז {state['tender_id']}...")
    state["tender"] = client.fetch_tender_context(state["tender_id"])
    return state


def tech_stack_node(state: GraphState, agent_config: Config) -> GraphState:
    tender = state["tender"]
    print("מפיק המלצה טכנולוגית...")

    prompt = _TECH_STACK_PROMPT.format(
        title=tender.get("title", ""),
        short_description=tender.get("shortDescription", ""),
        product_type=tender.get("productType", ""),
        ai_application_type=tender.get("aiApplicationType", ""),
        additional_details=tender.get("additionalDetails", ""),
    )

    llm_client = genai.Client(api_key=agent_config.gemini_api_key)
    response = llm_client.models.generate_content(model=agent_config.llm_model, contents=prompt)
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw[4:] if raw.startswith("json") else raw
    data = json.loads(raw)

    state["tech_stack"] = {
        "recommendation": data.get("recommendation", ""),
        "reasoning": data.get("reasoning", ""),
    }
    return state


def _to_references(items, limit: int):
    references = []
    for item in (items or [])[:limit]:
        url = item.get("link")
        if not url:
            continue
        references.append(
            {
                "title": item.get("title") or url,
                "url": url,
                "description": (item.get("snippet") or "")[:300],
            }
        )
    return references


def _google_search(query: str, agent_config: Config, num_results: int = 5):
    response = requests.get(
        _GOOGLE_SEARCH_ENDPOINT,
        params={
            "key": agent_config.google_search_api_key,
            "cx": agent_config.google_search_engine_id,
            "q": query,
            "num": num_results,
        },
        timeout=10,
    )
    response.raise_for_status()
    return response.json().get("items", [])


def research_node(state: GraphState, agent_config: Config) -> GraphState:
    """עד 5 פרויקטי open-source דומים + עד 5 מקורות קריאה (Google Custom Search).
    כשל בחיפוש (timeout/rate-limit) לא מפיל את כל ריצת ה-agent - ממשיכים עם
    רשימה ריקה ומסמנים research_failed=True, כדי ש-save_node יציין זאת בבירור
    למשתמש."""
    tender = state["tender"]
    tech_stack = state.get("tech_stack", {})
    query_base = (
        f"{tender.get('title', '')} {tender.get('shortDescription', '')} "
        f"{tech_stack.get('recommendation', '')}"
    ).strip()

    state["open_source_references"] = []
    state["reading_sources"] = []
    research_failed = False

    try:
        print("מחפש פרויקטי open-source דומים...")
        items = _google_search(f"{query_base} {_OPEN_SOURCE_SITES}", agent_config, num_results=5)
        state["open_source_references"] = _to_references(items, 5)
    except Exception as error:  # noqa: BLE001 - כשל חיפוש בודד לא יפיל את כל ריצת ה-agent
        print(f"אזהרה: חיפוש open-source נכשל: {error}")
        research_failed = True

    try:
        print("מחפש מקורות קריאה...")
        items = _google_search(f"{query_base} {_READING_SITES}", agent_config, num_results=5)
        state["reading_sources"] = _to_references(items, 5)
    except Exception as error:  # noqa: BLE001
        print(f"אזהרה: חיפוש מקורות קריאה נכשל: {error}")
        research_failed = True

    state["research_failed"] = research_failed
    return state


def spec_document_node(state: GraphState) -> GraphState:
    tender = state["tender"]
    tech_stack = state.get("tech_stack", {})
    open_source = state.get("open_source_references", [])
    reading = state.get("reading_sources", [])

    lines = [
        f"# מסמך אפיון: {tender.get('title', '')}",
        "",
        "## רקע",
        tender.get("shortDescription") or tender.get("additionalDetails") or "אין תיאור נוסף.",
        "",
        "## המלצה טכנולוגית",
        tech_stack.get("recommendation", "לא הופקה המלצה"),
        tech_stack.get("reasoning", ""),
        "",
        "## מטרות",
        f"- מימוש {tender.get('productType', 'המוצר')} מסוג {tender.get('aiApplicationType', '')}".strip(),
        "",
        "## שלבים מוצעים (Milestones)",
        "1. הקמת שלד הפרויקט וסביבת פיתוח",
        "2. מימוש הפונקציונליות המרכזית",
        "3. בדיקות ותיקוני שגיאות",
        "4. מסירה ותיעוד",
        "",
        "## היקף ראשוני",
        tender.get("additionalDetails") or "יוגדר בשלב הבא מול הלקוח.",
    ]

    if open_source:
        lines += ["", "## פרויקטים דומים בקוד פתוח"]
        lines += [f"- [{ref['title']}]({ref['url']})" for ref in open_source]

    if reading:
        lines += ["", "## מקורות קריאה מומלצים"]
        lines += [f"- [{ref['title']}]({ref['url']})" for ref in reading]

    state["document"] = "\n".join(lines)
    return state


def save_node(state: GraphState, client: SafeAIClient) -> GraphState:
    specification = {
        "status": "ready",
        "techStackRecommendation": state.get("tech_stack", {}).get("recommendation", ""),
        "openSourceReferences": state.get("open_source_references", []),
        "readingSources": state.get("reading_sources", []),
        "document": state.get("document", ""),
    }

    if state.get("research_failed"):
        specification["errorMessage"] = (
            "חיפוש המקורות נכשל חלקית - חלק מהתוצאות (open-source ו/או מקורות קריאה) עשויות להיות חסרות."
        )

    print(f"שומר תוצאה עבור מכרז {state['tender_id']}...")
    client.save_specification(state["tender_id"], specification)
    state["status"] = "ready"
    return state
