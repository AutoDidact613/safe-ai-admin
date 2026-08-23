# apps/agent

שכבת סוכן (Agent) בפייתון, מבוססת FastAPI.

בזמן כתיבת הריפוי המחודש הזה לא היה קיים קוד פייתון בריפו, ולכן זהו שלד התחלתי בלבד:
- `GET /health` — בדיקת חיות (משמש גם ב-`HEALTHCHECK` של הדוקר וגם ב-`docker-compose`).
- `POST /v1/run` — נקודת קצה placeholder, יש להחליף בלוגיקת הסוכן האמיתית.

## הרצה מקומית

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

## בדיקות

```bash
pytest
```
