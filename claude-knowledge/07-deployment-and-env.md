# SafeAI — פריסה, Docker ומשתני סביבה

## הרצה מקומית
```bash
# Client
cd client && npm install && npm run dev      # http://localhost:5173

# Server
cd server && npm install && npm run dev      # http://localhost:3001 (ts-node-dev)

# שירותי Docker (LiteLLM + DBs)
cd server && docker-compose up
```

### scripts
- **server:** `dev` (ts-node-dev), `build` (tsc), `start` (node dist), `prod` (build+start), `typecheck`, `lint`, `test` (jest), `test:coverage`.
- **client:** `dev` (vite), `build` (`tsc -b && vite build`), `preview`, `lint`, `typecheck`.

## רכיבי תשתית (Docker)
- **MongoDB** — DB ראשי (Atlas בענן / container מקומי).
- **PostgreSQL** — DB של LiteLLM.
- **LiteLLM Proxy** — פורט `4000`. קונפיג: `server/litellm_config.yaml` (+ `docs/litellm_config.prod.yaml`). מנהל מודלים ומפתחות ספק.
- **SafeAI Server** — פורט `3001`. `server/Dockerfile` (+ `Dockerfile.dev`).
- **Nginx** — reverse proxy ב-production, מגיש את ה-client.
- קבצי compose: `server/docker-compose.yml` (dev), `server/deploy-compose.yaml` (prod). PM2: `ecosystem.config.js`.

## פריסת AWS — שלוש מלכודות (קריטי!)
האתר מוגש תחת **sub-path `/console/`** דרך nginx (לא root). בכל deploy צריך:
1. **Vite base** — `vite.config.ts` קורא מ-`VITE_BASE_PATH`; ב-prod: `VITE_BASE_PATH=/console/`.
2. **React Router basename** — חובה `basename="/console"` ב-Router, אחרת ניווט נשבר תחת sub-path.
3. **`VITE_API_URL=/console/api`** — יחסי, nginx עושה rewrite.

צריך קובץ `.env.production` עם שלושת הערכים בכל build.

## משתני סביבה
### Client
- `VITE_API_URL` — בסיס ה-API (dev: `http://localhost:3001`; prod: `/console/api`)
- `VITE_BASE_PATH` — prod: `/console/`
- `VITE_GOOGLE_CLIENT_ID`

### Server
- `PORT` (3001), `NODE_ENV`
- `MONGO_URI` — MongoDB
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `LITELLM_PROXY_URL` (למשל `http://172.18.0.3:4000`), `LITELLM_MASTER_KEY`
- `OPENAI_API_KEY` — embeddings + LLM filtering
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` — nodemailer (אימות/איפוס)
- `ENCRYPTION_KEY` — 32-byte hex להצפנת מפתחות (`utils/crypto.ts`)
- **`ALLOWED_ORIGINS`** — CORS, מ-env ולא hardcoded. prod: `https://safeai613.com,https://www.safeai613.com`
  > הערה: בקוד הנוכחי (`index.ts`) ה-CORS מוגדר עדיין כ-localhost hardcoded — ב-prod מתבססים על env.

> קבצי דוגמה: `client/.env.example`, `server/.env.example`. אסור לקמיט `.env` אמיתיים.

## Git workflow
- `main` מוגן — אין push ישיר. עבודה ב-`feature/<name>`.
- כל שינוי דרך PR; CI חייב לעבור לפני merge (`.github/workflows/quality.yml`).
- כללים מלאים: `docs/GIT/GIT_RULES.md`, `docs/GIT/GIT_WORKFLOW.md`.
