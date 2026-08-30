import json

from google import genai

from api_client import SafeAIClient
from config import Config
from graph_state import GraphState

try:
    from tavily import TavilyClient
except ImportError:  # pragma: no cover - only missing if requirements.txt wasn't installed
    TavilyClient = None


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


def _to_references(results, limit: int):
    references = []
    for item in (results or [])[:limit]:
        url = item.get("url")
        if not url:
            continue
        references.append(
            {
                "title": item.get("title") or url,
                "url": url,
                "description": (item.get("content") or "")[:300],
            }
        )
    return references


def research_node(state: GraphState, agent_config: Config) -> GraphState:
    """עד 5 פרויקטי open-source דומים + עד 5 מקורות קריאה (Tavily). כשל בחיפוש
    (timeout/rate-limit) לא מפיל את כל ריצת ה-agent - ממשיכים עם רשימה ריקה
    ומסמנים research_failed=True, כדי ש-save_node יציין זאת בבירור למשתמש."""
    tender = state["tender"]
    tech_stack = state.get("tech_stack", {})
    query_base = (
        f"{tender.get('title', '')} {tender.get('shortDescription', '')} "
        f"{tech_stack.get('recommendation', '')}"
    ).strip()

    state["open_source_references"] = []
    state["reading_sources"] = []
    research_failed = False

    if TavilyClient is None:
        print("אזהרה: חבילת tavily אינה מותקנת, מדלג על חיפוש מקורות.")
        state["research_failed"] = True
        return state

    tavily = TavilyClient(api_key=agent_config.tavily_api_key)

    try:
        print("מחפש פרויקטי open-source דומים...")
        open_source_results = tavily.search(
            query=f"open source github project similar to: {query_base}",
            max_results=5,
            include_domains=["github.com", "gitlab.com"],
        )
        state["open_source_references"] = _to_references(open_source_results.get("results"), 5)
    except Exception as error:  # noqa: BLE001 - כשל חיפוש בודד לא יפיל את כל ריצת ה-agent
        print(f"אזהרה: חיפוש open-source נכשל: {error}")
        research_failed = True

    try:
        print("מחפש מקורות קריאה...")
        reading_results = tavily.search(
            query=f"technical articles and best practices about: {query_base}",
            max_results=5,
        )
        state["reading_sources"] = _to_references(reading_results.get("results"), 5)
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
