# proxyService.ts - תיעוד העבודה של השירות

## מטרת הקובץ
`server/src/services/proxyService.ts` הוא שכבת התיווך המרכזית בין האפליקציה לבין ספקי ה-AI דרך LiteLLM.  
הקובץ מקבל בקשות מהשרת, מבצע ולידציה וסינון, מוסיף הוראות מערכת, שולח את הבקשה לספק המתאים, ומחזיר את התוצאה ללקוח.

---

## תחומי אחריות מרכזיים

### 1. זיהוי ספק לפי שם המודל
הקובץ מזהה לאיזה ספק שייך המודל על סמך השם שלו.
לדוגמה:
- `gpt-*` או `o3*` → `openai`
- `claude*` → `anthropic`
- `gemini*` → `google`
- `llama*`, `groq*`, `qwen*` → `groq`

אם שם המודל כולל prefix כמו `provider/model`, הוא משתמש ישירות ב-prefix הזה.

### 2. שליפת מפתחות API
לכל בקשה הקובץ:
- שולף את מפתח הספק המתאים למשתמש או למערכת
- מפענח את המפתח המוצפן
- שולף את מפתח ה-LiteLLM proxy של המשתמש
- בודק האם המפתח מוגדר כ-free לצורכי חיוב

### 3. סינון תוכן לפני שליחה למודל
לפני שליחת הבקשה ל-AI, הקובץ:
- מחלץ את הטקסט הרלוונטי מתוך הבקשה
- בונה query מסודר לבדיקה
- מעביר את הטקסט ל-`guardInput(...)`

אם הסינון מחזיר חסימה, הפונקציה מחזירה תשובת חסימה במקום להמשיך לעיבוד.

### 4. הוספת system prompt
הקובץ טוען system prompt מתוך הפרופיל של המשתמש ומוסיף אותו לבקשה:
- ב-Chat Completions הוא מוכנס כ-message מסוג `system`
- ב-Responses API הוא מוכנס לשדה `instructions`
- ב-Anthropic Messages הוא מוכנס לשדה `system`

### 5. ניתוב הבקשות ל-LiteLLM
הקובץ שולח את הבקשה ל-LiteLLM בהתאם לסוג ה-API:
- `/v1/chat/completions`
- `/v1/responses`
- `/v1/messages`
- `/v1/images/generations`
- `/v1/audio/transcriptions`
- `/v1/audio/speech`

### 6. תמיכה ב-streaming
כאשר `body.stream === true`, השירות:
- קורא את ה-stream מהתשובה של LiteLLM
- מעביר את המידע ללקוח בזמן אמת
- אוסף usage במהלך הזרימה
- מחשב עלות גם כאשר LiteLLM לא מחזיר cost מפורש
- שומר usage ב-log בסיום הזרימה

### 7. רישום שימוש וחישוב עלויות
הקובץ רושם נתוני שימוש באמצעות `logUsage(...)` ומצרף:
- מזהה משתמש
- מזהה פרופיל
- ספק
- שם מודל
- מצב משתמש (`BYOK` / `MANAGED`)
- זמן תגובה
- עלות משוערת או מחושבת
- נתוני tokens

כאשר LiteLLM לא מחזיר עלות, הקובץ מחשב אותה לפי tokens באמצעות `calculateCostFromTokens(...)`.

---

## הפונקציות הראשיות בקובץ

### `proxyChatCompletion(user, body)`
מטפל בבקשות Chat Completions.

#### מה הוא עושה:
1. מזהה את הספק מתוך המודל
2. שואב מפתח ספק מתאים
3. מפענח את מפתחות ה-API
4. מבצע סינון תוכן
5. מוסיף system prompt
6. שולח את הבקשה ל-LiteLLM
7. מחזיר JSON או stream
8. רושם usage ועלות

#### שימוש מתאים ל:
- שיחות טקסט רגילות
- מודלים של OpenAI Chat
- בקשות streaming

---

### `proxyResponses(user, body)`
מטפל בבקשות ל-Responses API.

#### מאפיינים מיוחדים:
- תומך בפורמט `input` של Responses API
- מנרמל usage מ-`input_tokens/output_tokens`
- מוסיף system prompt לשדה `instructions`
- תומך ב-streaming וב-non-streaming

---

### `proxyAnthropicMessages(user, body)`
מטפל בבקשות Anthropic Messages.

#### מאפיינים מיוחדים:
- מוודא שהמודל שייך לספק אנתרופיק
- מוסיף header של `anthropic-version`
- מאחד system prompt עם `body.system` אם קיים
- תומך גם ב-streaming

---

### `proxyImageGeneration(user, body)`
מטפל ביצירת תמונות.

#### מה הוא עושה:
- שולח את הבקשה ל-LiteLLM Images API
- מחשב עלות תמונה לפי:
  - model
  - size
  - quality
  - מספר תמונות (`n`)
- רושם שימוש בסיום

---

### `proxyAudioTranscription(user, formData, model)`
מטפל בתמלול אודיו.

#### מה הוא עושה:
- מעביר `FormData` ישירות ל-LiteLLM
- מחזיר את תוצאת התמלול
- רושם usage

#### הערה:
בגרסה הנוכחית החיוב עבור Whisper מוגדר ל-0, כי חסר חילוץ של משך האודיו לפני התמלול.

---

### `proxyAudioSpeech(user, body)`
מטפל בהמרת טקסט לדיבור (TTS).

#### מה הוא עושה:
- שולח בקשה ל-LiteLLM Audio Speech API
- מקבל פלט בינארי של אודיו
- מחזיר:
  - `buffer`
  - `contentType`
- מחשב עלות TTS לפי אורך הטקסט

---

## זרימת עבודה כללית

```text
Client Request
   ↓
Controller
   ↓
proxyService.ts
   ↓
1. זיהוי ספק ומודל
2. שליפת מפתחות
3. סינון תוכן
4. הוספת system prompt
5. שליחה ל-LiteLLM
6. קבלת תשובה / stream
7. חישוב cost
8. logUsage
   ↓
Client Response
```

---

## פונקציות עזר פנימיות

### `getProviderFromModel(model)`
מזהה את הספק מתוך שם המודל.

### `normalizeModelName(model, provider)`
מוסיף prefix של ספק אם המודל לא כולל אותו כבר.

### `getLiteLLMCost(response, data)`
מנסה לחלץ cost מתוך headers או מתוך body של LiteLLM.

### `extractTextFromMessageContent(content)`
מחלץ טקסט מתוך content בפורמט string או array.

### `extractLastMessagesForFilter(messages, count)`
אוסף את ההודעות האחרונות לצורכי סינון.

### `extractUserIntentForFilter(messages, count)`
מחלץ את כוונת המשתמש מהודעות היסטוריות, תוך סינון רעש של agent/tool logs.

### `extractLastInputsForResponses(input, count)`
מחלץ input רלוונטי מתוך Responses API.

### `isAgentNoiseForFilter(text)`
מזהה טקסט שאינו נחשב קלט משתמש אמיתי, אלא רעש של סוכן או סביבת עבודה.

---

## קבצים ותלויות מרכזיות

### ייבואי ליבה
- `AIProfile` - קריאת פרופיל ה-AI של המשתמש
- `decryptSecret` - פענוח מפתחות מוצפנים
- `getProviderKeyByUserAndProvider` - שליפת מפתח ספק של משתמש
- `getSystemProviderKey` - שליפת מפתח מערכת
- `logUsage` - רישום שימוש וחיוב
- `isProviderKeyFree` - בדיקה האם המפתח פטור מחיוב
- `buildSystemPrompt` - בניית system prompt מהפרופיל
- `guardInput` - סינון קלט

### חישובי עלות
- `calculateCostFromTokens`
- `calculateImageCost`
- `calculateTTSCost`
- `calculateWhisperCost`
- `normalizeTokenUsage`

### לוגים
- `logger` משמש לתיעוד דיבוג, שגיאות, ועלויות

---

## נקודות חשובות מבחינת תפעול

1. **הקובץ תלוי ב-LiteLLM**  
   אם ה-proxy של LiteLLM לא זמין, כל המסלולים ייכשלו.

2. **הקובץ מבצע סינון לפני שליחה**  
   לכן בקשה עלולה להיחסם גם אם המודל עצמו היה יכול לענות עליה.

3. **חישוב העלות אינו אחיד בין כל ה-APIs**  
   כל endpoint מטופל בהתאם לפורמט ה-usage שלו.

4. **Streaming דורש טיפול מיוחד**  
   צריך גם להעביר את הנתונים ללקוח וגם לאסוף usage לוגי.

5. **Whisper עדיין דורש שיפור**  
   כדי לחשב עלות מדויקת יש צורך בחילוץ duration מהקובץ האודיו.

---

## בעיות אפשריות שכדאי לשים לב אליהן

- שם מודל לא מזוהה עלול לזרוק שגיאה
- מפתח ספק חסר יגרום לכשל מיידי
- מפתח LiteLLM חסר/פגום יפסיק את ה-flow
- תגובת LiteLLM לא תקינה תעלה חריגה
- בבקשות streaming יש צורך לוודא שה-stream נסגר נכון בסיום

---

## סיכום
`proxyService.ts` הוא אחד הקבצים המרכזיים במערכת.  
הוא אחראי על כל המסלול של בקשות AI: קבלה, סינון, הוספת הוראות מערכת, ניתוב ל-LiteLLM, טיפול בתשובות, חישוב עלויות, ורישום שימוש.

במילים פשוטות: זהו ה-service שמנהל את כל עבודת ה-proxy של ה-AI במערכת.
