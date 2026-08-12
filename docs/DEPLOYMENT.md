# פריסה ו-DevOps — SafeAI-613

מסמך זה מתאר את מבנה המונו-ריפו, את שכבת הדוקר, ואת תהליכי ה-CI/CD שהוגדרו כרגע (כולל מה שהוא **מדומה בכוונה** ומחכה להשלמה יחד).

## 1. מבנה הריפו

```
/
├─ apps/
│  ├─ client/   React + Vite + TS
│  ├─ server/   Node.js + Express + TS
│  └─ agent/    Python + FastAPI (שלד בלבד כרגע — לא היה קיים קוד פייתון בריפו)
├─ infra/
│  ├─ docker/nginx/     Dockerfile + nginx.conf שמגישים את ה-client ומעבירים /api לשרת
│  ├─ litellm/          litellm_config.yaml (ללא סודות — ראו סעיף 4)
│  └─ legacy/           ecosystem.config.js (הגדרת PM2 ישנה, נשמרה להיסטוריה)
├─ docker-compose.yml       סביבת פיתוח מקומית — כולל mongo+postgres מקומיים
├─ docker-compose.prod.yml  סביבת production — מריץ רק images מוכנים, ללא build
└─ .github/workflows/
   ├─ ci.yml              בדיקות איכות (lint/typecheck/test/build) לכל אפליקציה + build של כל תמונות הדוקר
   ├─ cd-staging.yml       פריסה בעת push ל-develop
   └─ cd-production.yml    פריסה בעת push ל-main
```

## 2. טופולוגיית הדוקר

| שירות | Local dev (`docker-compose.yml`) | Production (`docker-compose.prod.yml`) |
|---|---|---|
| `nginx` | בונה מהריפו, מגיש client + מעביר `/api/*` לשרת | image מוכן מהרג'יסטרי |
| `server` | build מ-`Dockerfile.dev` (hot reload) | image מוכן, `Dockerfile` (multi-stage, `node:20-alpine`) |
| `agent` | build מקומי | image מוכן |
| `litellm` | image רשמי + Postgres מקומי | image רשמי + Postgres מנוהל (Neon/אחר) |
| `mongo` | קונטיינר מקומי | **לא רץ** — מתחברים ל-MongoDB Atlas דרך `MONGO_URI` |
| `postgres` | קונטיינר מקומי (בסיס הנתונים הפנימי של LiteLLM) | **לא רץ** — מתחברים ל-Postgres מנוהל דרך `DATABASE_URL` |

**למה אין Mongo/Postgres בפרודקשן בדוקר?** כרגע יש לכם שירותים מנוהלים (Atlas, וכן Postgres חיצוני עבור LiteLLM כשתרצו) — אלה כוללים גיבויים, ניטור ו-HA "בחינם". להריץ מסדי נתונים סטייטפוליים בקונטיינר יחיד על EC2 בודד זה בדיוק המקום שבו קורות תקלות פריסה (איבוד וולום, אין גיבוי, ריסטארט מוחק דאטה אם שוכחים volume). אם תרצו להריץ Postgres עצמאית על ה-EC2 — אפשר, אבל כדאי להחליט את זה יחד עם תוכנית גיבוי (`pg_dump` מתוזמן + שמירה מחוץ למכונה, למשל ל-S3).

## 3. איך מריצים

**פיתוח מקומי (הכל בדוקר, כולל DB-ים מקומיים):**
```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
cp apps/agent/.env.example apps/agent/.env
docker compose up --build
# client: http://localhost:8080  |  server ישיר: http://localhost:3001  |  litellm: http://localhost:4000
```

**Production (על ה-EC2, אחרי שהתמונות כבר נבנו ונדחפו ע"י ה-CD):**
```bash
cp .env.example .env   # למלא ערכי אמת (כולל את כל המשתנים מ-apps/server/.env.example), ואז: chmod 600 .env
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## 4. ניהול סודות (Secrets)

**מה תוקן כחלק מהעבודה הזו:** בקובץ ה-config של LiteLLM (כיום `infra/litellm/litellm_config.yaml`) ה-`master_key` וה-`database_url` היו כתובים ישירות בקובץ (hardcoded), למרות שכבר לא הצביעו על סוד חי אמיתי בפועל ב-`develop` (את תקלת הסיסמה שדלפה בעבר כבר טיפלת). בכל זאת, כתובת ה-config עצמה עברה להפניה למשתני סביבה (`os.environ/LITELLM_MASTER_KEY`, `os.environ/DATABASE_URL`) כהרגל עבודה נכון — כך שאותו קובץ בטוח להישאר בריפו לכל סביבה, וה-master key האמיתי (שעדיין מופיע היום כערך קבוע `sk-safe-ai-master-123` בכמה מקומות ב-`develop`) כדאי גם הוא להתחלף לערך אקראי (`openssl rand -hex 32` או דומה) בהזדמנות, פשוט כי הוא חשוף היום בקוד.

**איך מנהלים סודות מעכשיו:**
1. **מקומי**: קובצי `.env` (לא נכנסים לגיט — מכוסה ב-`.gitignore`).
2. **CI/CD**: GitHub Environments — `staging` ו-`production` (ב-Settings → Environments של הריפו). כל סוד (מפתחות API, `MONGO_URI`, `DATABASE_URL`, מפתחות SSH לפריסה) מוגדר בנפרד לכל Environment, כך שסוד של production לא נגיש לפריסת staging.
3. **על ה-EC2**: קובץ `.env` יחיד עם הרשאות `chmod 600`, לא בבעלות משתמש שאינו נחוץ.
4. **שדרוג עתידי (מומלץ, לא הוקם עדיין)**: מכיוון שאתם כבר על AWS — כדאי לשקול **AWS Secrets Manager** או **SSM Parameter Store** במקום קובץ `.env` על הדיסק, כדי שסודות לא יישבו כטקסט גלוי על המכונה. זה משהו שכדאי לדבר עליו כשנשב על הפרטים.

## 5. CI/CD — מה קיים ומה מדומה

- **`ci.yml`**: רץ על כל PR ועל push ל-`main`/`develop`. בודק lint/typecheck/build לכל אחת משלוש האפליקציות, ובסוף מנסה לבנות את כל תמונות הדוקר (בלי לדחוף) כדי לתפוס שבירות Docker מוקדם. (מאחד לקובץ אחד את שני קבצי ה-CI שהיו קיימים בנפרד ב-`develop` — `ci.yml` ו-`quality.yml`.)
- **`cd-staging.yml`**: רץ על push ל-`develop`. בונה ודוחף images אמיתיים ל-GitHub Container Registry (`ghcr.io`), עם תיוג לפי git sha וגם `staging`. שלב ה-**deploy עצמו הוא מדומה** — הוא רק מדפיס מה הוא *היה* עושה (SSH לשרת + `docker compose pull && up -d`).
- **`cd-production.yml`**: אותו דבר עבור push ל-`main`, עם תיוג `latest`.

**למה מדומה?** כי חסרים לנו עדיין: כתובת ה-EC2, מפתח SSH לפריסה, והחלטה על מנגנון הפריסה המדויק. ברגע שיש את הפרטים האלה, יש הערות `TODO` מוכנות בכל אחד מהקבצים עם הצעד האמיתי (שימוש ב-`appleboy/ssh-action`), רק צריך להסיר את ה-`#` ולהוסיף את הסודות ל-Environment המתאים.

**מומלץ להגדיר (לא ניתן דרך קוד, רק ב-Settings של הריפו):** ל-Environment בשם `production` להוסיף **Required reviewers**, כך שכל פריסה ל-production תדרוש אישור ידני של מישהו לפני שהיא רצה בפועל — רשת ביטחון פשוטה וזולה נגד "לחיצה בטעות".

## 6. נקודות DevOps חשובות שכיסינו

- **Healthchecks**: לכל שירות (server, agent, litellm, nginx) יש `HEALTHCHECK`/`healthcheck` ברמת הדוקר, ו-`depends_on: condition: service_healthy` כך שהשרת לא יעלה לפני ש-LiteLLM מוכן.
- **הגבלת לוגים**: ב-`docker-compose.prod.yml` הוגדר `max-size`/`max-file` לכל שירות — בלי זה, לוגים לא מוגבלים יכולים למלא את הדיסק של ה-EC2 עם הזמן (תקלה נפוצה מאוד בשרת יחיד).
- **הגבלת זיכרון** (`mem_limit`) לכל שירות, כדי שקונטיינר "משתולל" לא יפיל את כל המכונה.
- **`restart: unless-stopped`** בכל מקום, כדי ששירותים יעלו מחדש אחרי קריסה או ריבוט של המכונה.
- **גרסת Node אחידה**: ה-Dockerfile הישן של השרת השתמש ב-`node:14` (מיושן משמעותית), עודכן ל-`node:20-alpine` עם build רב-שלבי (multi-stage) — התמונה הסופית לא מכילה devDependencies או קוד TypeScript גולמי.
- **משתמש לא-root** בתוך קונטיינר השרת והסוכן.
- **`.dockerignore`** בכל אפליקציה כדי ש-`.env`, `node_modules` וכו' לא ייכנסו בטעות להקשר הבנייה.

## 7. מה עוד לא מכוסה — לשבת עליו יחד

- **מנגנון הפריסה בפועל** (SSH+compose מול AWS CodeDeploy/ECS) והסודות הנדרשים לו.
- **HTTPS/TLS**: כרגע `nginx` מאזין רק על פורט 80. כשיש דומיין קבוע, כדאי Let's Encrypt (certbot) — או שכבת TLS ב-Load Balancer של AWS לפני ה-EC2.
- **נתיב ה-URL בפרודקשן**: שמנו לב שב-`apps/client/.env.example` יש הערה על פריסה תחת `/console/` (בהתאמה למבנה ה-PM2 הישן). ה-`nginx` שהוגדר כאן מגיש הכל מהשורש (`/`) — אם בפועל תרצו לשמור על נתיב `/console/` (למשל כדי לשתף דומיין עם שירותים אחרים), צריך להתאים את `infra/docker/nginx/nginx.conf` ואת `VITE_BASE_PATH`/`ROUTER_BASE` בזמן ה-build.
- **מוניטורינג והתראות**: אין היום שום דבר שיתריע אם השירות נופל (רק `restart: unless-stopped` שמנסה להעלות מחדש). כדאי בדיקת "חיים" חיצונית פשוטה (Uptime check) כצעד ראשון.
- **גיבויים ל-Postgres** אם בעתיד יוחלט להריץ אותו עצמאית במקום Neon/מנוהל.
- **בעיה קיימת ולא קשורה שנתקלנו בה**: יש שגיאות build קיימות מראש ב-TypeScript (למשל ב-`apps/server/src/repositories/userRepository.ts`, `authService.ts`, `usageTracker.ts` ועוד) — נראה שזה נובע מאי-התאמת טיפוסים כללית מול Mongoose, כנראה כתוצאה משדרוג גרסה. זה קיים גם היום ב-`develop` ו**לא** נגרם מהשינויים כאן, אבל שימו לב: כרגע ה-CI/CD (גם `ci.yml` וגם ה-build של תמונת הדוקר של השרת) ייכשל עד שזה יתוקן. `npm run lint` עובר בהצלחה (0 שגיאות, רק אזהרות) — הבעיה היא ספציפית ל-`tsc`.
