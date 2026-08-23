from langchain_core.tools import tool

from api_client import SafeAIClient


def make_tools(client: SafeAIClient) -> list:
    @tool
    def get_inquiry_details(inquiry_id: str) -> dict:
        """מחזיר את פרטי הפנייה המלאים לפי מזהה: סטטוס עדכני (open/closed),
        סוג הפנייה, תאריך פתיחה, וכל היסטוריית התגובות עליה. שימושי כשצריך
        מידע שלא קיים ב-state הנוכחי של הגרף (למשל: לפני ניסוח טיוטה, לבדוק
        אם כבר יש תגובות קודמות; או לבדוק אם הפנייה נסגרה בינתיים)."""
        return client.get_inquiry_details(inquiry_id)

    return [get_inquiry_details]
