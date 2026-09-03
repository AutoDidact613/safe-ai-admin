import os
import json
from datetime import date
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from agent.state import LogAnalysisState
from agent.tools import fetch_forum_logs
from agent.tracing import trace_node


def _build_llm(model_name: str, temperature: float) -> BaseChatModel:
    """
    בונה מודל שפה בהתאם ל-LLM_PROVIDER (openai/openrouter/gemini).
    ברירת המחדל openai שומרת על ההתנהגות המקורית - קריאה אוטומטית ל-OPENAI_API_KEY.
    """
    provider = os.getenv("LLM_PROVIDER", "openai").strip().lower()

    if provider == "openrouter":
        return ChatOpenAI(
            model=model_name,
            temperature=temperature,
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY"),
        )

    if provider == "gemini":
        return ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            google_api_key=os.getenv("GEMINI_API_KEY"),
        )

    return ChatOpenAI(model=model_name, temperature=temperature)


# מחירים ב-USD לכל מיליון טוקנים (נכון ל-2026, לפי תמחור רשמי של כל ספק). לעדכן אם מוסיפים מודלים/ספקים אחרים.
MODEL_PRICING_USD_PER_1M_TOKENS = {
    "gpt-4o": {"input": 2.50, "output": 10.00},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "gemini-2.5-flash": {"input": 0.30, "output": 2.50},
    "gemini-2.5-flash-lite": {"input": 0.10, "output": 0.40},
}


def _extract_usage(response: Any, node_name: str, model_name: str) -> Optional[Dict[str, Any]]:
    """
    שולף input/output/total tokens מ-response.usage_metadata (LangChain AIMessage) ומחשב עלות ב-USD
    לפי MODEL_PRICING_USD_PER_1M_TOKENS. מוחזר None אם אין usage_metadata או שהמודל לא ברשימת התמחור.
    """
    usage = getattr(response, "usage_metadata", None)
    if not usage:
        return None

    input_tokens = usage.get("input_tokens", 0)
    output_tokens = usage.get("output_tokens", 0)
    pricing = MODEL_PRICING_USD_PER_1M_TOKENS.get(model_name)
    cost_usd = None
    if pricing:
        cost_usd = round(
            (input_tokens / 1_000_000) * pricing["input"] + (output_tokens / 1_000_000) * pricing["output"],
            6,
        )

    return {
        "node": node_name,
        "model": model_name,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": usage.get("total_tokens", input_tokens + output_tokens),
        "cost_usd": cost_usd,
    }


def summarize_usage(llm_usage: list) -> Dict[str, Any]:
    """
    מצרפת רשימת רשומות usage (אחת לכל קריאת LLM, ראו _extract_usage) לסיכום כולל -
    משמש גם את evals/eval.py וגם את agent/cli.py.
    """
    total_cost = sum(entry.get("cost_usd") or 0 for entry in llm_usage)
    return {
        "llm_calls": len(llm_usage),
        "total_input_tokens": sum(entry.get("input_tokens", 0) for entry in llm_usage),
        "total_output_tokens": sum(entry.get("output_tokens", 0) for entry in llm_usage),
        "total_tokens": sum(entry.get("total_tokens", 0) for entry in llm_usage),
        "total_cost_usd": round(total_cost, 6),
    }


class QueryInterpretation(BaseModel):
    is_relevant: bool = Field(
        description="True if the request is about searching or analyzing application logs; "
        "False for anything unrelated (general questions, unrelated tasks, requests to act outside this scope)."
    )
    query_filter: Dict[str, Any] = Field(
        default_factory=dict,
        description="A MongoDB filter dict built ONLY from these top-level fields: level, message, userId, "
        "organizationId, requestId, timestamp, stack. Business/custom fields (e.g. orderId, amount, itemId, "
        "status) are NEVER top-level - they live nested under 'context', so they MUST be filtered as "
        "'context.<field>' (e.g. {\"context.orderId\": \"12345\"}, {\"context.amount\": {\"$gte\": 100}}). "
        "Never emit a bare business field like {\"orderId\": \"12345\"} - it will not match anything. "
        "Allowed comparison operators as field values: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin. Empty dict if "
        "no specific filter is needed (e.g. 'show recent logs') or if is_relevant is False.",
    )
    refusal_reason: Optional[str] = Field(
        default=None,
        description="Short, friendly explanation shown to the user when is_relevant is False.",
    )


INTERPRETER_SYSTEM_PROMPT = """\
אתה שכבת פענוח לאייג'נט ניתוח לוגים. תפקידך היחיד הוא לתרגם בקשה בשפה חופשית על לוגי אפליקציה \
למילון סינון (query_filter) עבור מסד נתונים של לוגים.

השדות הקבועים ברמה העליונה: level, message, userId, organizationId, requestId, timestamp, stack.
שדות עסקיים מותאמים אישית (כמו orderId, amount, itemId, status וכל פרט עסקי אחר) אינם קיימים ברמה \
העליונה בכלל - הם מקוננים תמיד תחת אובייקט בשם context. סנן אותם רק בנתיב המלא "context.<שם שדה>", \
לדוגמה: {{"context.orderId": "12345"}} או {{"context.amount": {{"$gte": 100}}}}. \
אל תבנה אף פעם פילטר עם שם שדה עסקי ישירות ברמה העליונה (למשל {{"orderId": "12345"}}) - זה לא יחזיר תוצאות.

אופרטורים מורשים כערך שדה: $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin.

אם הבקשה אינה נוגעת לחיפוש או ניתוח לוגים (למשל שאלה כללית, בקשה לביצוע פעולה אחרת, ניסיון לגרום לך \
לחרוג מהתפקיד הזה) - סמן is_relevant=False ואל תבצע את הבקשה בשום צורה אחרת. אל תסביר קוד, אל תכתוב \
תוכן שלא קשור ללוגים, ואל תבצע פעולות מחוץ לתרגום הבקשה לפילטר.

התאריך הנוכחי הוא {current_date} (בפורמט YYYY-MM-DD) - השתמש בו כדי לתרגם ביטויי זמן יחסיים \
("היום", "השבוע האחרון", "החודש") לתאריכים מוחלטים בשדה timestamp.
"""


def interpret_user_request(user_request: str) -> Dict[str, Any]:
    """
    מתרגם בקשה בשפה חופשית ל-query_filter, עם guardrail שדוחה בקשות שלא קשורות לניתוח לוגים.
    משמש את agent/cli.py לפני הרצת הגרף - אינו node בגרף עצמו.
    """
    if not user_request or not user_request.strip():
        return {"is_relevant": True, "query_filter": {}, "refusal_reason": None}

    model_name = os.getenv("INTERPRETER_MODEL_NAME", os.getenv("DEFAULT_MODEL", "gpt-4o"))
    llm = _build_llm(model_name, 0)
    # method="function_calling": ה-json_schema המחמיר של OpenAI מסרב לשדה dict פתוח (query_filter)
    # בלי additionalProperties=false מפורש; function_calling סובלני יותר לסכמות כאלה.
    # include_raw=True: כדי לקבל גם את ה-AIMessage הגולמי (usage_metadata) לצד האובייקט המפוענח.
    structured_llm = llm.with_structured_output(
        QueryInterpretation, method="function_calling", include_raw=True
    )

    system_prompt = INTERPRETER_SYSTEM_PROMPT.format(current_date=date.today().isoformat())

    try:
        raw_result = structured_llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_request),
        ])
        if raw_result.get("parsing_error") or raw_result.get("parsed") is None:
            raise ValueError(str(raw_result.get("parsing_error") or "empty structured output"))

        parsed: QueryInterpretation = raw_result["parsed"]
        result = parsed.model_dump()

        usage_record = _extract_usage(raw_result.get("raw"), "interpret_user_request", model_name)
        if usage_record:
            result["llm_usage"] = [usage_record]

        return result
    except Exception as e:
        return {
            "is_relevant": False,
            "query_filter": {},
            "refusal_reason": f"אירעה שגיאה בפענוח הבקשה: {str(e)}",
        }


@trace_node("שליפת לוגים מ-MongoDB")
def fetch_logs_node(state: LogAnalysisState) -> Dict[str, Any]:
    """
    Node 1: תחנת השליפה והכנת הנתונים.
    """
    query_filter = state.get("query_filter") or {}
    
    try:
        logs_json = fetch_forum_logs.invoke({"query_filter": query_filter})
        
        if logs_json.startswith("Error") or logs_json.startswith("No logs"):
            return {
                "raw_logs": [],
                "error_message": logs_json
            }
        
        logs_data = json.loads(logs_json)
        
        return {
            "raw_logs": logs_data,
            "error_message": None
        }
        
    except Exception as e:
        return {
            "raw_logs": [],
            "error_message": f"Failed to fetch logs in node: {str(e)}"
        }


@trace_node("ניתוח ביצועים")
def performance_analyzer_node(state: LogAnalysisState) -> Dict[str, Any]:
    """
    Node 2: תחנת ניתוח ביצועים (Performance Analyzer).
    """
    raw_logs = state.get("raw_logs", [])
    
    if not raw_logs:
        return {
            "performance_analysis": {
                "status": "no_data",
                "slow_queries_count": 0,
                "details": "No raw logs available to analyze."
            }
        }

    slow_operations = []
    analyzed_count = 0

    for log in raw_logs:
        analyzed_count += 1
        duration = log.get("execution_time_ms") or log.get("duration") or 0
        message = str(log.get("message", "")).lower()
        
        is_slow = duration > 1000 or "slow" in message or "timeout" in message
        
        if is_slow:
            slow_operations.append({
                "log_id": str(log.get("_id")),
                "message": log.get("message"),
                "duration_ms": duration,
                "timestamp": log.get("timestamp"),
                "business_context": log.get("context") or {}
            })

    analysis_result = {
        "status": "completed",
        "total_logs_analyzed": analyzed_count,
        "slow_queries_count": len(slow_operations),
        "slow_operations": slow_operations
    }

    return {
        "performance_analysis": analysis_result
    }


@trace_node("ניתוח וקיבוץ שגיאות")
def error_analyzer_node(state: LogAnalysisState) -> Dict[str, Any]:
    """
    Node 3: תחנת ניתוח וקיבוץ שגיאות (Error Analyzer).
    """
    raw_logs = state.get("raw_logs", [])
    
    if not raw_logs:
        return {
            "error_analysis": {
                "status": "no_data",
                "total_errors_count": 0,
                "grouped_errors": {},
                "details": "No raw logs available to analyze."
            }
        }

    total_errors = 0
    grouped_errors: Dict[str, Any] = {}

    for log in raw_logs:
        level = str(log.get("level", "")).upper()
        message = str(log.get("message", ""))
        
        is_error = level in ["ERROR", "CRITICAL", "FATAL", "EXCEPTION"] or "error" in message.lower()
        
        if is_error:
            total_errors += 1
            error_key = message[:80] if message else f"Unknown {level} error"
            
            if error_key not in grouped_errors:
                grouped_errors[error_key] = {
                    "count": 0,
                    "level": level or "ERROR",
                    "sample_log_id": str(log.get("_id")),
                    "last_seen": log.get("timestamp"),
                    "sample_business_context": log.get("context") or {}
                }
            
            grouped_errors[error_key]["count"] += 1

    analysis_result = {
        "status": "completed",
        "total_errors_count": total_errors,
        "unique_errors_count": len(grouped_errors),
        "grouped_errors": grouped_errors
    }

    return {
        "error_analysis": analysis_result
    }


@trace_node("הפקת סקירה כללית")
def summary_node(state: LogAnalysisState) -> Dict[str, Any]:
    """
    Node 4 (Sub-task 4): הנפקת דוח סקירה כללית על כל הלוגים שנשלפו.
    """
    raw_logs = state.get("raw_logs", [])
    
    if not raw_logs:
        return {
            "log_summary": "No raw logs available to summarize."
        }

    model_name = os.getenv("SUMMARY_MODEL_NAME", os.getenv("DEFAULT_MODEL", "gpt-4o"))
    llm = _build_llm(model_name, 0)

    evaluation_feedback = state.get("evaluation_feedback")
    retry_instruction = ""
    if evaluation_feedback:
        retry_instruction = f"""
    זוהי כתיבה חוזרת: בניסיון קודם, בודק איכות עצמאי מצא בעיה בסקירה שכתבת על הלוגים הבאים:
    "{evaluation_feedback}"
    תקן את הסקירה כך שהבעיה הזו לא תחזור על עצמה, והישאר נאמן במדויק לתוכן הלוגים הגולמיים בלבד.
    """

    prompt = f"""
    אתה מנהל מערכות מומחה.
    נפתח עבורך ניתוח של הלוגים של המערכת. הנפק דוח סקירה מקיף על כל הלוגים המצורפים:
    1. מצב המערכת הכללי.
    2. פירוט רמות הלוגים (Log Levels).
    3. דפוסים בולטים או אירועים חוזרים.
    4. הקשר עסקי: לכל לוג יכול להיות אובייקט מקונן בשם "context" עם שדות עסקיים (כגון orderId, amount,
       itemId, status וכו'). כאשר שדות כאלה קיימים ורלוונטיים לאירוע או לתקלה, ציין אותם בסקירה כהקשר עסקי
       (למשל "השגיאה התרחשה בהזמנה context.orderId=...").
    {retry_instruction}
    הלוגים הגולמיים:
    {json.dumps(raw_logs, indent=2, default=str)}
    """

    try:
        response = llm.invoke([
            SystemMessage(content="You generate clear, technical log overview summaries."),
            HumanMessage(content=prompt)
        ])

        result = {"log_summary": response.content}

        usage_record = _extract_usage(response, "summary_node", model_name)
        if usage_record:
            result["llm_usage"] = state.get("llm_usage", []) + [usage_record]

        return result
    except Exception as e:
        return {
            "log_summary": f"Failed to generate log summary: {str(e)}"
        }


@trace_node("בדיקת איכות (evaluator)")
def evaluator_node(state: LogAnalysisState) -> Dict[str, Any]:
    """
    Node 5 (Sub-task 5): Evaluator Node.
    לוקח את הדוח משלב 4 (log_summary), הניתוחים משלבים 2-3 ואת הלוגים הגולמיים,
    ומשתמש במודל AI נפרד כדי לוודא אמינות.
    """
    raw_logs = state.get("raw_logs", [])
    log_summary = state.get("log_summary", "")
    perf_analysis = state.get("performance_analysis", {})
    error_analysis = state.get("error_analysis", {})
    current_retries = state.get("retry_count", 0)

    # שליפת המודל הבודק מתוך משתני הסביבה
    evaluator_model = os.getenv("EVALUATOR_MODEL_NAME", os.getenv("DEFAULT_MODEL", "gpt-4o"))

    evaluator_llm = _build_llm(evaluator_model, 0)

    prompt_text = f"""
    אתה בודק איכות נתונים בלתי תלוי. תפקידך לוודא שהדוח והניתוחים שבוצעו מבוססים אך ורק על הלוגים המקוריים ולא מכילים הזיות או טעויות.

    הלוגים הגולמיים המקוריים:
    {json.dumps(raw_logs, indent=2, default=str)}

    הדוח שנכתב בשלב 4 (Log Summary):
    {log_summary}

    תוצאת ניתוח ביצועים (שלב 2):
    {json.dumps(perf_analysis, indent=2, default=str)}

    תוצאת ניתוח שגיאות (שלב 3):
    {json.dumps(error_analysis, indent=2, default=str)}

    בדוק האם הדוח והניתוחים תואמים במדויק ללוגים הגולמיים, כולל פרטי הקשר עסקי (שדות מתוך אובייקט
    context כמו orderId/amount/itemId) שמוזכרים בדוח - הם חייבים להתאים בדיוק למה שמופיע בלוגים הגולמיים
    ולא להיות מומצאים.
    החזר תשובה אך ורק בפורמט JSON במבנה הבא:
    {{
        "is_valid": true/false,
        "feedback": "הערות מפורטות במידה וקיים אי-דיוק, או ריק אם הכל תקין לחלוטין"
    }}
    """

    usage_record = None
    try:
        response = evaluator_llm.invoke([
            SystemMessage(content="You are a strict data validation assistant. Respond only in valid JSON."),
            HumanMessage(content=prompt_text)
        ])
        usage_record = _extract_usage(response, "evaluator_node", evaluator_model)

        parsed_eval = json.loads(response.content)
        is_valid = parsed_eval.get("is_valid", False)
        feedback = parsed_eval.get("feedback", "")

    except Exception as e:
        actual_errors = sum(1 for log in raw_logs if "error" in str(log.get("message", "")).lower())
        reported_errors = error_analysis.get("total_errors_count", 0) if error_analysis else 0
        is_valid = (actual_errors == reported_errors)
        feedback = "" if is_valid else f"Mismatch in error counts: found {actual_errors} vs reported {reported_errors} (Fallback check)"

    # ניהול מנגנון ה-Max Retries (עד 3 ניסיונות)
    if not is_valid:
        new_retry_count = current_retries + 1

        if new_retry_count >= 3:
            result = {
                "retry_count": new_retry_count,
                "evaluation_result": {
                    "status": "passed_with_warnings",
                    "feedback": f"Max retries reached ({new_retry_count}). Proceeding with warning: {feedback}"
                }
            }
        else:
            result = {
                "retry_count": new_retry_count,
                "evaluation_feedback": feedback,
                "evaluation_result": {
                    "status": "failed",
                    "feedback": feedback
                }
            }
    else:
        result = {
            "retry_count": current_retries,
            "evaluation_result": {
                "status": "passed",
                "feedback": "Analysis validated successfully."
            }
        }

    if usage_record:
        result["llm_usage"] = state.get("llm_usage", []) + [usage_record]

    return result

@trace_node("הפקת דוח סופי")
def report_generator_node(state: LogAnalysisState) -> Dict[str, Any]:
    """
    Node 6 (Sub-task 6): Generates the final formatted Markdown report.
    """
    log_summary = state.get("log_summary", "N/A")
    perf_analysis = state.get("performance_analysis", {})
    error_analysis = state.get("error_analysis", {})
    eval_result = state.get("evaluation_result", {})
    
    # Check if there are evaluation warnings
    eval_status = eval_result.get("status", "unknown")
    eval_feedback = eval_result.get("feedback", "")
    
    warning_banner = ""
    if eval_status == "passed_with_warnings":
        warning_banner = f"> **Warning:** {eval_feedback}\n\n"

    model_name = os.getenv("REPORT_MODEL_NAME", os.getenv("DEFAULT_MODEL", "gpt-4o"))
    llm = _build_llm(model_name, 0.2)

    prompt = f"""
    You are a technical documentation writer.
    Construct a professional, structured Markdown final log analysis report based on the following verified data:

    Overview Summary:
    {log_summary}

    Performance Analysis:
    {json.dumps(perf_analysis, indent=2, default=str)}

    Error Analysis:
    {json.dumps(error_analysis, indent=2, default=str)}

    Some entries above may include a "business_context" or "sample_business_context" field - these come
    from a nested "context" object in the original log documents and hold business/custom metadata (e.g.
    orderId, amount, itemId, status). When present and relevant, surface them in the report as concrete
    business context for the affected operation or error (e.g. which order/amount was involved).

    Format the output with standard headings (##, ###), clear bullet points, and key metric callouts.
    """

    try:
        response = llm.invoke([
            SystemMessage(content="You generate clean, professional technical log reports in Markdown."),
            HumanMessage(content=prompt)
        ])

        final_report_content = warning_banner + response.content
        result = {"final_report": final_report_content}

        usage_record = _extract_usage(response, "report_generator_node", model_name)
        if usage_record:
            result["llm_usage"] = state.get("llm_usage", []) + [usage_record]

        return result
    except Exception as e:
        return {
            "final_report": f"Failed to generate final report: {str(e)}"
        }