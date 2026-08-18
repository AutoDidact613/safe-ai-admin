# פריסה ו-DevOps — SafeAI-613

מסמך זה מתאר את מבנה המונו-ריפו, את תהליכי ה-CI/CD, ואת **המציאות בפועל** של שתי הסביבות ב-AWS — כולל כל התקלות שנתקלנו בהן בפריסה הראשונה שעבדה בפועל (חשוב לקרוא את סעיף 10 לפני שמנסים שוב).

## 1. מבנה הריפו

```
/
├─ apps/
│  ├─ client/   React + Vite + TS — נבנה כקבצים סטטיים, לא רץ בדוקר ב-staging/production
│  ├─ server/   Node.js + Express + TS
│  └─ agent/    Python + FastAPI
├─ infra/
│  ├─ docker/nginx/     Dockerfile + nginx.conf.template — בשימוש רק לפיתוח מקומי (docker-compose.yml). ב-staging/production אין nginx בדוקר בכלל, ראו סעיף 8.
│  ├─ litellm/          litellm_config.yaml (ללא סודות — ראו סעיף 5)
│  └─ legacy/           ecosystem.config.js (הגדרת PM2 ישנה, נשמרה להיסטוריה)
├─ docker-compose.yml       סביבת פיתוח מקומית — כולל mongo+postgres מקומיים ו-nginx בדוקר
├─ docker-compose.prod.yml  רץ על ה-EC2 (staging ו-production) — litellm+server+agent בלבד, ללא nginx
└─ .github/workflows/
   ├─ ci.yml              בדיקות איכות (lint/typecheck/test/build) לכל אפליקציה + build של תמונות הדוקר
   ├─ cd-staging.yml       פריסה בעת push ל-develop — **פעיל ונבדק בפועל**
   └─ cd-production.yml    פריסה בעת push ל-main — **עדיין לא נבדק בפועל**, ראו סעיף 2
```

## 2. שתי סביבות נפרדות לגמרי — אל תתבלבלו ביניהן

זו הטעות היקרה ביותר שאפשר לעשות כאן: **staging ו-production הן שתי מכונות EC2 נפרדות לחלוטין**, עם topology שונה. תמיד לוודא `hostname`/`curl -s ifconfig.me` לפני שמריצים משהו.

| | **Staging** | **Production** |
|---|---|---|
| דומיין | `dev.safeai613.com` | `safeai613.com` |
| Hostname | `ip-172-31-4-7` | `ip-172-31-65-222` (שונה!) |
| IP | `98.89.219.65` | (לא תועד כאן בכוונה — לבדוק ב-AWS Console) |
| מוצרים על אותה מכונה | רק SafeAI-613 | SafeAI-613 **+ LibreChat** |
| נתיב URL | שורש (`/`) | תת-נתיב (`/console/`) — כי LibreChat תופס את השורש |
| קבצים סטטיים | `/var/www/safeai` | `/var/www/ai613/console/client/dist/` |
| repo checkout | `~/SafeAI-613` (בית של `ubuntu`) | `/opt/safeai/SafeAI-613` (לפי תיעוד ההקמה המקורי) |
| TLS | **אין** — HTTP בלבד (סביבת בדיקות) | יש, Let's Encrypt/certbot |
| CD פעיל | כן — `cd-staging.yml`, SSH | לא עדיין — `cd-production.yml` כתוב (OIDC+SSM) אבל **מעולם לא הופעל בפועל** |

**עד כה, כל העבודה בסעיף הזה בוצעה ואומתה רק על staging.** production לא נגעה בכלל בתהליך הזה — היא ממשיכה לרוץ איך שהוקמה במקור (ראו `infra/legacy/ecosystem.config.js` ותיעוד ההקמה החיצוני, אם קיים).

## 3. טופולוגיית הדוקר

| שירות | Local dev (`docker-compose.yml`) | Staging/Production (`docker-compose.prod.yml`) |
|---|---|---|
| `nginx` | בדוקר, בונה מהריפו, מגיש client + מעביר `/api/*` לשרת | **לא קיים בקובץ הזה בכלל** — ה-nginx **של המערכת** (מחוץ לדוקר, כבר קיים על כל מכונה) מגיש את ה-client כקבצים סטטיים ומעביר `/api/` ל-`server` דרך `http://localhost:3001` |
| `server` | build מ-`Dockerfile.dev` (hot reload) | image מוכן מ-GHCR, פורט מפורסם ל-`127.0.0.1:3001` כדי שה-nginx החיצוני יגיע אליו |
| `agent` | build מקומי | image מוכן מ-GHCR |
| `litellm` | image רשמי + Postgres מקומי | image רשמי + Postgres מנוהל (Neon) |
| `mongo` | קונטיינר מקומי | **לא רץ** — MongoDB Atlas דרך `MONGO_URI` |
| `postgres` | קונטיינר מקומי | **לא רץ** — Postgres מנוהל (Neon) דרך `DATABASE_URL` |

ה-client **נבנה ישירות על ה-host** (לא בדוקר) כחלק מסקריפט ה-deploy עצמו — ראו סעיף 6.

## 4. איך מריצים

**פיתוח מקומי (הכל בדוקר, כולל DB-ים מקומיים):**
```bash
cp .env.example .env
cp apps/server/.env.example apps/server/.env
cp apps/agent/.env.example apps/agent/.env
docker compose up --build
# client: http://localhost:8080  |  server ישיר: http://localhost:3001  |  litellm: http://localhost:4000
```

**ידנית על ה-EC2 (staging/production), בלי CD:**
```bash
cd ~/SafeAI-613   # staging. ב-production: /opt/safeai/SafeAI-613
git pull
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
cd apps/client && npm ci && VITE_API_URL=/api VITE_BASE_PATH=/ npm run build   # /console/ ו-/console/api ב-production
sudo cp -r dist/. /var/www/safeai/   # /var/www/ai613/console/client/dist/ ב-production
```

## 5. ניהול סודות (Secrets)

**שני קבצי `.env` שונים לגמרי — קלות טעות אמיתית שקרתה בפועל:**
- `apps/server/.env` — רלוונטי רק אם מריצים את השרת **ישירות** (לא בדוקר), למשל תחת PM2 הישן.
- `.env` **בשורש** ה-repo — זה מה ש-`docker compose` קורא בפועל (גם ל-`${VAR}` substitution בתוך `docker-compose.prod.yml`, וגם דרך `env_file: .env` לתוך containers של `server`/`agent`). **אם הוא חסר, `docker compose up` נכשל על `.env not found` בלי הסבר ברור.**

ודאו ששני הקבצים תואמים כשמעדכנים ערך (למשל `MONGO_URI`) — ותוך שימת לב ל-**וודאות ש-`DATABASE_URL` הוא Postgres (Neon), לא Mongo!** זו טעות אמיתית שקרתה — `litellm` דורש `postgresql://`, לא `mongodb+srv://`; אם הערך הלא-נכון מגיע ל-`DATABASE_URL`, litellm יכתוב ללוג `unsupported scheme 'mongodb+srv'` בבירור.

1. **מקומי**: קובצי `.env` (מכוסה ב-`.gitignore`).
2. **CI/CD**: GitHub Environment בשם `staging` (Settings → Environments) עם 3 Secrets: `STAGING_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_KEY` (מפתח SSH **ייעודי** לדיפלוי, לא אישי — ראו סעיף 6).
3. **על ה-EC2**: קובץ `.env` יחיד בשורש עם הרשאות `chmod 600`.
4. **שדרוג עתידי (מומלץ, לא הוקם עדיין)**: AWS Secrets Manager / SSM Parameter Store במקום `.env` על הדיסק.

## 6. CI/CD

- **`ci.yml`**: רץ על כל PR ועל push ל-`main`/`develop`. lint/typecheck/build לכל אפליקציה + build של תמונות הדוקר (בלי push).
- **`cd-staging.yml`**: רץ על push ל-`develop`. **נבדק ועובד בפועל.** בונה ודוחף `server`+`agent` ל-GHCR (`ghcr.io/safeai613/safeai-613` — **hardcoded lowercase**, ראו סעיף 10), ואז פורס דרך **SSH** (`appleboy/ssh-action`) עם Secrets `STAGING_HOST`/`STAGING_SSH_USER`/`STAGING_SSH_KEY`. הסקריפט: `git reset --hard origin/develop` (במתכוון, לא `pull` — זה יעד deploy, לא מכונת עבודה) → `docker compose -f docker-compose.prod.yml pull && up -d` → בניית ה-client ישירות על ה-host והעתקה ל-`/var/www/safeai`.
- **`cd-production.yml`**: אותו רעיון עבור push ל-`main`, אבל דרך **AWS OIDC + SSM** (לא SSH — ראו סעיף 9) — **עדיין לא הופעל בפועל אף פעם**, רק כתוב. יתכן שיתגלו בו תקלות דומות לאלה שבסעיף 10 ברגע שיופעל לראשונה.

**למה SSH ב-staging ו-OIDC+SSM ב-production?** SSH עם מפתח ייעודי הוא מהיר להקים ומספיק בטוח לסביבת בדיקות; OIDC+SSM (בלי מפתחות קבועים, בלי פורט 22 פתוח) הוא הסטנדרט הגבוה יותר ששמור ל-production. אפשר לשקול לשדרג את staging לאותו מנגנון בהמשך.

**מומלץ להגדיר (לא ניתן דרך קוד):** ל-Environment `production` להוסיף **Required reviewers**.

## 7. נקודות DevOps חשובות

- **Healthchecks**: לכל שירות (`server`, `agent`, `litellm`) יש `healthcheck`, ו-`depends_on: condition: service_healthy`.
- **הגבלת לוגים/זיכרון**: `max-size`/`max-file` ו-`mem_limit` לכל שירות.
- **`restart: unless-stopped`** בכל מקום.
- **משתמש לא-root** בתוך קונטיינר השרת והסוכן.
- **`.dockerignore`** בכל אפליקציה.

## 8. nginx: המערכת מגישה הכל, אין nginx בדוקר

לשתי הסביבות יש nginx **ברמת המערכת** (מחוץ לדוקר לגמרי) שמחזיק את הדומיין, מגיש את קבצי ה-client הסטטיים ישירות, ומעביר `/api/` ל-`server`:

```nginx
# staging בפועל (HTTP בלבד) — /etc/nginx/sites-available/ במכונת staging
server {
    listen 80;
    server_name dev.safeai613.com;

    root /var/www/safeai;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

ב-**production** ההגיון זהה, רק תחת `/console/` (כי `/` שמור ל-LibreChat) עם `root /var/www/ai613/console/client/dist/`, ועם `ssl_certificate` (Let's Encrypt/certbot). לא ראינו את קובץ ה-nginx האמיתי של production בשיחה הזו — יש לאתר אותו על אותה מכונה (`sudo nginx -T | grep -B1 server_name` אם שם הקובץ לא ידוע מראש).

**המשמעות ל-Docker:** ה-`server` container חייב לפרסם את הפורט שלו ל-host (`ports: 127.0.0.1:3001:3001` ב-`docker-compose.prod.yml`) כדי שה-nginx החיצוני יוכל להגיע אליו — אין רשת דוקר משותפת בין השניים.

## 9. הקמה חד-פעמית ב-AWS: OIDC + SSM (ל-`cd-production.yml` בלבד)

זה עדיין רלוונטי רק ל-production (staging משתמש ב-SSH, ראו סעיף 6) — ולא נבדק בפועל:

1. **OIDC Identity Provider**: IAM → Identity providers → Add provider → OpenID Connect, URL `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
2. **IAM Role** עם Trust policy שמתירה רק לריפו הזה:
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
3. **Permissions policy** מצומצם ל-SSM על ה-instance הרלוונטי בלבד:
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
4. **על ה-EC2**: SSM Agent רץ + IAM instance profile עם `AmazonSSMManagedInstanceCore`.
5. **ב-GitHub**: Secrets `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`, `EC2_INSTANCE_ID` ב-Environment `production`.
6. **על ה-EC2**: `docker login ghcr.io` פעם אחת (טוקן עם `read:packages`).

## 10. תקלות אמיתיות שנתקלנו בהן — ותיקונים (מהפריסה הראשונה שעבדה בפועל)

זו הרשימה החשובה ביותר במסמך — כל אחת מהן עצרה את ה-CD בפועל, לא תיאורטית:

1. **תגי Docker חייבים lowercase.** `IMAGE_BASE: ghcr.io/${{ github.repository }}` נכשל מיד (`repository name must be lowercase`) כי `github.repository` מחזיר `SafeAI613/SafeAI-613` (אותיות גדולות). **תיקון**: hardcode ל-`ghcr.io/safeai613/safeai-613`.
2. **אין nginx בדוקר ב-staging בכלל** — ראו סעיף 8. גרסה מוקדמת של הקוד הזה ניסתה להריץ nginx בדוקר עם bind ל-`/console/`, שלא תואם למה שבאמת רץ על אף אחת מהמכונות.
3. **תהליך PM2 ישן תפס את פורט 3001.** לפני המעבר לדוקר, `safeai-server` רץ תחת PM2 (`pm2 list`) במשך 29 יום, מחזיק את פורט 3001 — וה-container `server` נכשל לעלות עם `address already in use`. **תיקון**: `pm2 stop safeai-server && pm2 delete safeai-server && pm2 save` פעם אחת בכל מכונה שעוברת לדוקר.
4. **`wget` לא קיים ב-image של litellm** (`ghcr.io/berriai/litellm:main-latest`). ה-healthcheck (`wget -q -O- .../health/liveliness`) נכשל **לנצח**, לא בגלל זמן — בדיקה עם `docker exec ... which wget` הראתה `not found`. זה בלבל אותנו לחשוב שזו בעיית תזמון (הגדלנו `start_period` מ-180 ל-300 שניות בלי תועלת) לפני שגילינו את השורש האמיתי. **תיקון**: healthcheck עם `python3 -c "import urllib.request; urllib.request.urlopen(...)"` (מאומת: `python3` כן קיים ב-PATH של ה-image הזה).
5. **`mongodb+srv://` נכשל לפענח DNS בתוך דוקר** (`querySrv ECONNREFUSED`) — bug ידוע: ה-DNS resolver המובנה של דוקר (`127.0.0.11`) לא מטפל טוב תמיד ב-SRV records. **תיקון ראשוני** (חלקי מדי): `dns: [8.8.8.8, 8.8.4.4]` על השירות `server` — זה פתר את ה-Mongo אבל **שבר** את הרזולוציה הפנימית של דוקר לשמות containers אחרים (`litellm`), כי זה **מחליף** את ה-resolver המובנה במקום להוסיף עליו. גילינו את זה כי הקריאה הפנימית ל-litellm (`/key/generate`, בהרשמה) התחילה ליפול ב-timeout של 5 שניות. **תיקון סופי**: `dns: [127.0.0.11, 8.8.8.8, 8.8.4.4]` — resolver של דוקר קודם (שמות containers פנימיים), ציבורי כ-fallback ל-SRV.
6. **`apiCall()` בקוד ה-client הכפיל את `/api`.** `API_ENDPOINTS.*` (ב-`apps/client/src/config/api.ts`) כבר בנוי עם `API_BASE_URL` אפוי בפנים (למשל `/api/auth/register`), אבל `apiCall()`'s `resolveUrl()` הוסיף את `API_BASE_URL` **שוב** לכל דבר שלא מתחיל ב-`http` — וב-`/api` (יחסי) זה תפס גם endpoints שכבר היו מוכנים. זה **בלתי נראה בפיתוח מקומי**, כי שם `VITE_API_URL` הוא כתובת מלאה (`http://localhost:3001`) שכבר עוברת את בדיקת ה-`starts with http`. מתבטא כ-`404` על `/api/api/auth/register`. **תיקון**: `resolveUrl()` מדלג על ההוספה אם ה-endpoint כבר מתחיל ב-`API_BASE_URL`.
7. **הגנת הענף (`develop`) איפשרה עקיפה בטעות.** "Do not allow bypassing" היה מסומן, אבל סעיף נפרד — "Restrict who can push to matching branches" — כלל כברירת מחדל את "Organization administrators, repository administrators, and users with the Maintain role" ברשימת המורשים ל-push ישיר, מה שעקף בפועל את דרישת ה-PR. **תיקון**: הסרת התפקידים האלה מרשימת ה-push access.
8. **סקריפט ה-seed לא רץ מתוך קונטיינר ה-production.** ה-image של `server` נבנה עם `npm ci --omit=dev` ומעתיק רק `dist/` — אין שם `ts-node` ואין `src/`. חייבים להריץ אותו **ישירות על ה-host**, מתוך ה-git checkout, עם משתני הסביבה של `.env` בשורש טעונים ידנית (הסקריפט קורא `process.env` ישירות, בלי dotenv):
   ```bash
   cd ~/SafeAI-613/apps/server
   npm ci
   set -a; source ~/SafeAI-613/.env; set +a
   npx ts-node --transpile-only src/seedDevData.ts
   ```
   ה-`--transpile-only` נדרש כי `ts-node` (עם type-checking מלא) נכשל על שגיאת TS לא-קשורה ב-`seedDevData.ts` (`User.findOne({ email })`, TS2353) שלא מופיעה ב-`npm run build` הרגיל (`tsc`) שמשמש את ה-Dockerfile — ככל הנראה הבדל בהתנהגות type-checking בין השניים. הסקריפט עצמו בטוח להרצה חוזרת (idempotent, בודק לפי מפתח ייחודי).
9. **403 מהסביבה של Claude עצמה, לא מהשרת.** בדיקת `curl` לדומיין ה-staging מתוך sandbox של Claude Code החזירה `403` עם `x-deny-reason: host_not_allowed` — זה ה-proxy של סביבת ה-agent (allowlist דומיינים), **לא** אינדיקציה לתקלה אמיתית באתר. תמיד לוודא זמינות אמיתית מדפדפן/מכונה רגילה, לא מתוך session של Claude.

## 11. מה עוד לא מכוסה

- **מוניטורינג והתראות**: אין היום כלום שמתריע אם שירות נופל.
- **גיבויים ל-Postgres** אם בעתיד יריצו אותו עצמאית במקום Neon.
- **HTTPS ל-staging**: HTTP בכוונה כרגע.
- **שדרוג ניהול סודות**: מעבר מ-`.env` ל-AWS Secrets Manager/SSM Parameter Store.
- **`cd-production.yml` מעולם לא הופעל בפועל** — צפויות כנראה תקלות דומות לסעיף 10 בהפעלה הראשונה שלו (טופולוגיית production שונה: `/console/`, `/opt/safeai/SafeAI-613`, LibreChat על אותה מכונה).
- **תיקון היסטורי ל-`apps/server/package-lock.json`**: `npm ci` נכשל בעבר עם "lockfile out of sync" (חסרו `zod`/`gcp-metadata`) בגלל npm workspaces שהשפיעו על ה-hoisting; workspaces הוסרו והלוקפייל נבנה מחדש.
