# מדריך שמות וכללים לעבודה עם Git (למתכנתות מתחילות)

> המטרה: לעבוד בצורה אחידה וברורה כדי שיהיה קל לעשות Code Review, להבין היסטוריה של שינויים, ולשמור על ריפו נקי.

---

## 1) כללי בסיס
- **אנגלית בלבד** בשמות ברנצ'ים, קומיטים, טאגים ותיקיות (כדי למנוע בעיות תווים בכלים שונים).
- **kebab-case** כברירת מחדל (`like-this`) לשמות ברנצ'ים וטאגים.
- **PascalCase / camelCase** רק כשזה סטנדרט בקוד עצמו (למשל שמות קומפוננטות/קלאסים).
- שמות צריכים להיות **קצרים אבל אינפורמטיביים**: מה שיניתי ולמה.
- **כל שינוי משמעותי מגיע דרך Pull Request** (לא קומיטים ישירות ל־`main`).

---

## 2) מבנה ענפים (Branches)
### ענפים קבועים
- `main` – יציב, תמיד במצב שניתן לפרוס (deploy).
- (אופציונלי) `develop` – אם עובדים ב־GitFlow; אחרת עדיף להישאר עם `main` + feature branches.

### סוגי ענפים זמניים (Feature branches)
פורמט מומלץ:
```
<type>/<scope>-<short-description>
```

**types נפוצים**
- `feature/` – פיצ׳ר חדש
- `fix/` – תיקון באג
- `refactor/` – ריפקטור בלי שינוי התנהגות
- `chore/` – תחזוקה (תלויות, קונפיג, CI)
- `docs/` – תיעוד בלבד
- `test/` – בדיקות בלבד
- `hotfix/` – תיקון דחוף לפרודקשן

**דוגמאות**
- `feature/auth-login-form`
- `fix/api-timeout-retry`
- `refactor/user-service-split`
- `chore/update-deps`
- `docs/git-guidelines`

**מה להימנע**
- `feature/new` (כללי מדי)
- `mybranch` / `shoshi` (לא אומר מה השתנה)
- שמות עם רווחים או עברית

---

## 3) כללי קומיטים (Commit Messages)
### פורמט מומלץ (Conventional Commits – פשוט וברור)
```
<type>(optional-scope): <short imperative message>
```

**types**
- `feat` – פיצ׳ר
- `fix` – באג
- `refactor` – ריפקטור
- `docs` – תיעוד
- `test` – בדיקות
- `chore` – תחזוקה
- `perf` – שיפור ביצועים
- `build` – שינויי build/tooling
- `ci` – שינויי CI

**דוגמאות טובות**
- `feat(auth): add login form validation`
- `fix(api): handle 504 with retry`
- `refactor(users): split repository layer`
- `docs: add branching rules`
- `ci: run lint and tests on PR`

### כללי זהב לקומיט טוב
- קומיט אחד = **יחידת שינוי אחת** (לא “גם וגם וגם”).
- ההודעה צריכה לתאר **מה עשית** (ולא “אני שיניתי”).
- אם יש “למה” חשוב – הוסיפי בגוף הקומיט:
  - שורה ריקה
  - ואז פירוט קצר (2–6 שורות)

**דוגמה עם גוף**
```
fix(api): avoid duplicate requests on retry

The previous logic retried without cancelling the original request,
causing occasional duplicates under poor network conditions.
```

**מה לא לעשות**
- `update` / `fix` / `changes` (לא אינפורמטיבי)
- קומיט ענק שמערב פיצ׳ר + ריפקטור + פורמטינג

---

## 4) Pull Requests (PR) – מבנה וכללים
### שמות PR
- מומלץ להשתמש באותו סגנון כמו קומיטים:
  - `feat(auth): login form`
  - `fix(api): retry on 504`

### תיאור PR (Template מומלץ)
הוסיפי לריפו קובץ: `.github/pull_request_template.md`

תוכן מומלץ (אפשר להעתיק):
```md
## מה השתנה?
- 

## למה זה נחוץ?
- 

## איך לבדוק?
1. 
2. 

## צילום מסך / וידאו (אם יש UI)
- 

## הערות / סיכונים
- 

## Checklist
- [ ] בדיקות עוברות (tests)
- [ ] Lint/Typecheck עובר
- [ ] עדכנתי תיעוד אם צריך
- [ ] אין סודות/מפתחות בקוד
```

### כללי PR בריאים
- PR קטן עדיף על PR ענק.
- אם יש UI – לצרף צילום מסך/וידאו קצר.
- לשמור על עקביות: **הבראנץ׳ מייצר PR אחד** (אם צריך עוד – לפתוח ענף נוסף).

---

## 5) תגיות (Tags) וגרסאות (Releases)
אם אתן מוציאות גרסאות:
- להשתמש ב־**SemVer**:
  - `v1.2.3` (major.minor.patch)
- כללי אצבע:
  - `patch` – תיקון באג בלי לשבור API
  - `minor` – פיצ׳ר חדש בלי לשבור API
  - `major` – שינוי שובר

---

## 6) שמות תיקיות וקבצים (Naming בתוך הפרויקט)
- תיקיות: `kebab-case` (לדוגמה `user-service`, `api-client`)
- קבצי JS/TS:
  - utilities: `camelCase` או `kebab-case` לפי הקיים בפרויקט
  - React components: `PascalCase` לקובץ הקומפוננטה (למשל `UserCard.tsx`)
- להימנע משמות כמו `temp`, `new`, `final`, `final2`.

---

## 7) כללי עבודה מומלצים (Workflow קצר)
1. יוצרים ענף: `feature/...` או `fix/...`
2. עובדים בקומיטים קטנים וברורים
3. פותחים PR מול `main`
4. CI צריך לעבור (lint/tests/build)
5. Code Review (לפחות מאשרת אחת)
6. Merge (מומלץ: **Squash and merge** כדי לשמור היסטוריה נקייה)

---

## 8) טיפים פרקטיים (ששווה להכתיב)
- **אל תעלו סודות** (API keys, passwords). להשתמש ב־`.env` + `.gitignore`.
- **להריץ לפני PR**:
  - `npm test` / `pytest`
  - `npm run lint` / `ruff`
  - `npm run build` (אם יש)
- אם PR עוסק רק בפורמטינג – לסמן אותו כ־`chore:` או `style:` (אם אתן משתמשות בזה).

---

## 9) דוגמאות מהירות (Copy/Paste)
**בראנץ׳ חדש**
```
feature/dashboard-usage-cards
fix/oauth-redirect-uri
docs/readme-git-rules
```

**קומיטים**
```
feat(ui): add usage cards to dashboard
fix(auth): handle missing refresh token
docs: add pr template and branch naming
```

---

### סיכום
אם את זוכרת 3 דברים:
1) שמות ברורים ועקביים  
2) קומיטים קטנים ומשמעותיים  
3) כל שינוי נכנס דרך PR עם בדיקות ו־review  

בהצלחה! 👩‍💻
