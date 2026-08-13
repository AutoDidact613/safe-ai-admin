# פריסה ו-DevOps — SafeAI-613

מסמך זה מתאר את מבנה המונו-ריפו, את שכבת הדוקר, ואת תהליכי ה-CI/CD — כולל הפריסה בפועל ל-AWS.

## 1. מבנה הריפו

```
/
├─ apps/
│  ├─ client/   React + Vite + TS
│  ├─ server/   Node.js + Express + TS
│  └─ agent/    Python + FastAPI (שלד בלבד כרגע — לא היה קיים קוד פייתון בריפו)
├─ infra/
│  ├─ docker/nginx/     Dockerfile + nginx.conf.template — מגישים את ה-client תחת VITE_BASE_PATH (prod/staging: "/console/") ומעבירים "<base>api/" לשרת
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
| `nginx` | בונה מהריפו, מגיש client מהשורש (`/`) + מעביר `/api/*` לשרת | image מוכן מהרג'יסטרי, מגיש תחת `/console/` (ראו סעיף 7), פורט נקשר ל-`127.0.0.1` בלבד |
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
2. **CI/CD**: GitHub Environments — `staging` ו-`production` (ב-Settings → Environments של הריפו). כל סוד (מפתחות API, `MONGO_URI`, `DATABASE_URL`, `AWS_DEPLOY_ROLE_ARN` וכו' — ראו סעיף 5) מוגדר בנפרד לכל Environment, כך שסוד של production לא נגיש לפריסת staging. אין מפתחות SSH בכלל — הפריסה עצמה עוברת דרך AWS OIDC + SSM (סעיף 5, 8), בלי שום credential ארוך-טווח.
3. **על ה-EC2**: קובץ `.env` יחיד עם הרשאות `chmod 600`, לא בבעלות משתמש שאינו נחוץ.
4. **שדרוג עתידי (מומלץ, לא הוקם עדיין)**: מכיוון שאתם כבר על AWS — כדאי לשקול **AWS Secrets Manager** או **SSM Parameter Store** במקום קובץ `.env` על הדיסק, כדי שסודות לא יישבו כטקסט גלוי על המכונה. זה משהו שכדאי לדבר עליו כשנשב על הפרטים.

## 5. CI/CD

- **`ci.yml`**: רץ על כל PR ועל push ל-`main`/`develop`. בודק lint/typecheck/build לכל אחת משלוש האפליקציות, ובסוף מנסה לבנות את כל תמונות הדוקר (בלי לדחוף) כדי לתפוס שבירות Docker מוקדם.
- **`cd-staging.yml`**: רץ על push ל-`develop`. בונה ודוחף images אמיתיים ל-GitHub Container Registry (`ghcr.io`), עם תיוג לפי git sha וגם `staging`, ואז **פורס בפועל** ל-EC2 של סביבת הבדיקות (`dev.safeai613.com`).
- **`cd-production.yml`**: אותו דבר עבור push ל-`main`, עם תיוג `latest`, פורס בפועל ל-EC2 של production (`safeai613.com`).

**איך הפריסה בפועל עובדת (שני הקבצים, אותו מנגנון):**
1. GitHub Actions מתחבר ל-AWS דרך **OIDC** — לא שומרים שום מפתח AWS קבוע כ-Secret. ה-workflow "מתחזה" זמנית לתפקיד IAM ומקבל טוקן שתקף לדקות בודדות בלבד.
2. הפריסה עצמה רצה דרך **AWS SSM Run Command** — לא SSH. אין צורך לפתוח פורט 22 לאינטרנט בכלל; SSM עובד על תעבורה יוצאת (outbound) מה-EC2 בלבד.
3. הפקודה שרצה בפועל על המכונה: `cd /opt/safeai-613 && docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d && docker image prune -f`.

זה משמעותית יותר בטוח מ-SSH עם מפתח קבוע ב-Secret: אין credential ארוך-טווח שיכול לדלוף, ואין משטח תקיפה של פורט 22 פתוח.

**Secrets נדרשים (מוגדרים בנפרד לכל GitHub Environment — `staging`/`production`, ראו סעיף 4):**
| Secret | ערך |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | ARN של ה-IAM Role שה-workflow מתחזה אליו (ראו סעיף 8) |
| `AWS_REGION` | האזור של ה-EC2 (למשל `il-central-1` / `eu-central-1`) |
| `EC2_INSTANCE_ID` | ה-instance ID של המכונה (`i-...`) — שונה בין staging ל-production |

**מומלץ להגדיר (לא ניתן דרך קוד, רק ב-Settings של הריפו):** ל-Environment בשם `production` להוסיף **Required reviewers**, כך שכל פריסה ל-production תדרוש אישור ידני של מישהו לפני שהיא רצה בפועל — רשת ביטחון פשוטה וזולה נגד "לחיצה בטעות".

## 6. נקודות DevOps חשובות שכיסינו

- **Healthchecks**: לכל שירות (server, agent, litellm, nginx) יש `HEALTHCHECK`/`healthcheck` ברמת הדוקר, ו-`depends_on: condition: service_healthy` כך שהשרת לא יעלה לפני ש-LiteLLM מוכן.
- **הגבלת לוגים**: ב-`docker-compose.prod.yml` הוגדר `max-size`/`max-file` לכל שירות — בלי זה, לוגים לא מוגבלים יכולים למלא את הדיסק של ה-EC2 עם הזמן (תקלה נפוצה מאוד בשרת יחיד).
- **הגבלת זיכרון** (`mem_limit`) לכל שירות, כדי שקונטיינר "משתולל" לא יפיל את כל המכונה.
- **`restart: unless-stopped`** בכל מקום, כדי ששירותים יעלו מחדש אחרי קריסה או ריבוט של המכונה.
- **גרסת Node אחידה**: ה-Dockerfile הישן של השרת השתמש ב-`node:14` (מיושן משמעותית), עודכן ל-`node:20-alpine` עם build רב-שלבי (multi-stage) — התמונה הסופית לא מכילה devDependencies או קוד TypeScript גולמי.
- **משתמש לא-root** בתוך קונטיינר השרת והסוכן.
- **`.dockerignore`** בכל אפליקציה כדי ש-`.env`, `node_modules` וכו' לא ייכנסו בטעות להקשר הבנייה.

## 7. טופולוגיית הרשת: nginx של המערכת מול nginx של הדוקר

לשתי הסביבות יש כבר nginx **ברמת המערכת** (מחוץ לדוקר) שמחזיק את הדומיין:
- **production** (`safeai613.com`) — משרת גם מוצר נוסף (LibreChat) בשורש (`/`); SafeAI-613 מוגש תחת `/console/`. יש תעודת Let's Encrypt קיימת.
- **staging** (`dev.safeai613.com/console/`) — HTTP בלבד כרגע (בלי תעודה — זו סביבת בדיקות).

בגלל זה, ה-`nginx` container של הדוקר (`infra/docker/nginx/`) **לא יכול לתפוס בעצמו את פורט 80/443**. הוא נבנה עכשיו כך שהוא:
1. מגיש את ה-client ומעביר `/api` **תחת `/console/`** (`VITE_BASE_PATH=/console/`, `VITE_API_URL=/console/api` — נקבעים ב-build args של ה-CD, ראו `cd-staging.yml`/`cd-production.yml`).
2. ב-`docker-compose.prod.yml` הפורט שלו נקשר ל-`127.0.0.1:${NGINX_HOST_PORT:-8091}` בלבד — לא לכתובת הציבורית.

**הצעד שנדרש עלייך, פעם אחת בכל מכונה:** להוסיף ל-nginx **הקיים** (ברמת המערכת) בלוק location שמעביר `/console/` ל-container:

```nginx
# production — בתוך ה-server block הקיים שמחזיק את התעודה של safeai613.com
location /console/ {
    proxy_pass http://127.0.0.1:8091;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

```nginx
# staging — server block נפרד/קיים תחת dev.safeai613.com, HTTP בלבד (בלי ssl_certificate)
server {
    listen 80;
    server_name dev.safeai613.com;

    location /console/ {
        proxy_pass http://127.0.0.1:8091;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

לאחר עריכה: `nginx -t && systemctl reload nginx`. שימו לב ל-`proxy_pass http://127.0.0.1:8091;` **בלי** `/` בסוף — כך ה-nginx החיצוני מעביר את ה-path המלא (`/console/...`) הלאה, וזה תואם למה שה-`nginx` הפנימי בדוקר מצפה לו (הוא כבר מוגדר לשרת בדיוק תחת `/console/`, לא תחת שורש).

## 8. הקמה חד-פעמית ב-AWS: OIDC + SSM (ל-CD האמיתי)

כדי ש-GitHub Actions יוכל לפרוס בפועל בלי SSH ובלי סודות ארוכי-טווח, נדרשת הקמה חד-פעמית בקונסולת AWS (או ב-CLI) — זה לא משהו שניתן לבצע מתוך הריפו:

1. **OIDC Identity Provider**: IAM → Identity providers → Add provider → OpenID Connect, עם URL `https://token.actions.githubusercontent.com` ו-audience `sts.amazonaws.com`.
2. **IAM Role** (למשל `github-actions-deploy`) עם Trust policy שמתירה **רק** לריפו הזה להתחזות:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": { "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com" },
       "Action": "sts:AssumeRoleWithWebIdentity",
       "Condition": {
         "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
         "StringLike": { "token.actions.githubusercontent.com:sub": "repo:SafeAI613/SafeAI-613:*" }
       }
     }]
   }
   ```
3. **Permissions policy** על התפקיד — מצומצם רק ל-SSM ורק על מכונות ה-EC2 הרלוונטיות (מומלץ שני roles נפרדים, אחד ל-staging ואחד ל-production, עם `Resource` שמצביע רק על ה-instance המתאים):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["ssm:SendCommand", "ssm:GetCommandInvocation"],
       "Resource": [
         "arn:aws:ec2:<REGION>:<ACCOUNT_ID>:instance/<INSTANCE_ID>",
         "arn:aws:ssm:<REGION>::document/AWS-RunShellScript"
       ]
     }]
   }
   ```
4. **על כל EC2 עצמה**: לוודא ש-**SSM Agent** רץ (ברוב ה-AMI המודרניים כבר מותקן) ושיש למכונה **IAM instance profile** עם המדיניות המנוהלת `AmazonSSMManagedInstanceCore` — בלי זה המכונה לא "נראית" ל-SSM בכלל, גם אם ה-Role של ה-CD תקין.
5. **ב-GitHub**: להוסיף את ה-Secrets שבטבלה בסעיף 5 (`AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`, `EC2_INSTANCE_ID`) לכל אחד מה-Environments (`staging`/`production`) בנפרד.
6. **על כל EC2**: `docker login ghcr.io` פעם אחת עם token עם הרשאת `read:packages` (כדי שה-`docker compose pull` יצליח למשוך images פרטיים) — לא עובר דרך ה-CD בכלל, כדי לא לחשוף טוקן נוסף בלוגים.

## 9. מה עוד לא מכוסה — לשבת עליו יחד

- **מוניטורינג והתראות**: אין היום שום דבר שיתריע אם השירות נופל (רק `restart: unless-stopped` שמנסה להעלות מחדש). כדאי בדיקת "חיים" חיצונית פשוטה (Uptime check) כצעד ראשון.
- **גיבויים ל-Postgres** אם בעתיד יוחלט להריץ אותו עצמאית במקום Neon/מנוהל.
- **HTTPS ל-staging**: כרגע `dev.safeai613.com` נשאר HTTP בכוונה (סביבת בדיקות) — קל להוסיף Let's Encrypt בהמשך אם ירצו.
- **שדרוג ניהול סודות**: מעבר מ-`.env` על הדיסק ל-AWS Secrets Manager/SSM Parameter Store (ראו סעיף 4).
- **תיקון ל-`apps/server/package-lock.json`**: בזמן הבדיקה גילינו ש-`npm ci` (המצב הקפדני שמשתמשים בו ב-Dockerfile וב-CI, בניגוד ל-`npm install` הסלחני) נכשל על השרת עם שגיאת "lockfile out of sync" (חסרים בו שני רשומות תלות פנימיות אופציונליות — `zod` עבור החבילה `litellm`, ו-`gcp-metadata` עבור mongoose). בנוסף, כל עוד השורש (`package.json`) הכריז על npm workspaces שכללו את `apps/server`, ה-hoisting של npm שינה את עץ התלויות בפועל של השרת מספיק כדי לגרום לכשלי build מוזרים ב-TypeScript מול Mongoose (שגיאות "no overload matches"/"signatures incompatible"). **הפתרון**: הסרנו את ה-`workspaces` מה-`package.json` בשורש (כל אפליקציה מותקנת ונבנית באופן עצמאי לגמרי — בדיוק כמו שכל Dockerfile כבר עושה), ויצרנו מחדש את `apps/server/package-lock.json` כך שיהיה עקבי. אחרי התיקון: `npm ci && npm run build` על השרת עובר נקי (0 שגיאות), וכך גם lint (0 שגיאות) ו-68 הטסטים.
