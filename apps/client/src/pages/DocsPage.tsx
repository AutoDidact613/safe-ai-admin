// import { useState, useMemo } from "react";
import "../styles/docs-page.css";

// interface GuideCard {
//   id: string;
//   title: string;
//   description: string;
//   link: string;
//   category: string;
// }

// interface RecommendedGuide {
//   id: string;
//   title: string;
//   description: string;
//   link: string;
//   duration: string;
//   language: string;
//   technologies: string;
//   rating: string;
// }

// Data from the Excel spreadsheet
// const guideCards: GuideCard[] = [
//   {
//     id: "1",
//     title: "מדריך התחלה מהירה",
//     description: "למד את היסודות של SafeAI ותתחיל לעבוד תוך דקות",
//     link: "https://drive.google.com/file/d/example1",
//     category: "התחלה",
//   },
//   {
//     id: "2",
//     title: "ניהול משתמשים",
//     description: "כיצד להוסיף, לערוך ולנהל משתמשים במערכת",
//     link: "https://drive.google.com/file/d/example2",
//     category: "ניהול",
//   },
//   {
//     id: "3",
//     title: "הגדרות מתקדמות",
//     description: "עבודה עם מפתחות מנוהלים אישית",
//     link: "https://drive.google.com/file/d/example3",
//     category: "מתקדם",
//   },
//   {
//     id: "6",
//     title: "הגדרות מתקדמות",
//     description: "אינטגרציה עם מערכות חיצוניות",
//     link: "https://drive.google.com/file/d/example3",
//     category: "מתקדם",
//   },
//   {
//     id: "4",
//     title: "אבטחה ופרטיות",
//     description: "הבנת מדיניות האבטחה והפרטיות של SafeAI",
//     link: "https://drive.google.com/file/d/example4",
//     category: "אבטחה",
//   },
//   {
//     id: "5",
//     title: "שאלות נפוצות",
//     description: "תשובות לשאלות הנפוצות ביותר",
//     link: "https://drive.google.com/file/d/example5",
//     category: "תמיכה",
//   },
// ];

// Recommended guides for general learning - curated by Miriam Kaner
// const recommendedGuides: RecommendedGuide[] = [
//   {
//     id: "r1",
//     title: "פלטפורמת הלמידה של Hugging Face",
//     description:
//       "קורסים ומדריכים לבנייה ואימון של מודלי שפה ו-ML. כולל קורס Agents ועוד",
//     link: "https://huggingface.co/learn",
//     duration: "משתנה",
//     language: "אנגלית",
//     technologies: "Hugging Face, ML",
//     rating: "⭐⭐⭐⭐⭐",
//   },
//   {
//     id: "r2",
//     title: "בניית אייג'נטים מתקדמים עם LangGraph",
//     description:
//       "הדרכה מעולה בעברית על בניית אייג'נטים מתקדמים. כולל דוגמאות קוד מעשיות",
//     link: "https://www.youtube.com/watch?v=Uttm6avPYPY",
//     duration: "25 דקות",
//     language: "עברית",
//     technologies: "LangGraph",
//     rating: "⭐⭐⭐⭐⭐",
//   },
//   {
//     id: "r3",
//     title: "בניית Agent עם Google SDK",
//     description:
//       "מדריך מקיף לבניית Agent במהירות עם ה-SDK של Google. קליל, ברור ומקיף",
//     link: "https://www.youtube.com/watch?v=P4VFL9nIaIA",
//     duration: "3 שעות",
//     language: "אנגלית",
//     technologies: "Google SDK, Agents",
//     rating: "⭐⭐⭐⭐",
//   },
//   {
//     id: "r4",
//     title: "כתיבת סוכנים עם OpenAI SDK",
//     description:
//       "מדריך מקצועי לכתיבת סוכנים בעזרת קריאות ישירות מול ה-OpenAI SDK",
//     link: "https://www.youtube.com/watch?v=bZzyPscbtI8",
//     duration: "שעה",
//     language: "אנגלית",
//     technologies: "OpenAI SDK",
//     rating: "⭐⭐⭐⭐⭐",
//   },
//   {
//     id: "r5",
//     title: "ארכיטקטורה של בניית סוכנים - Anthropic",
//     description:
//       "המדריך הרשמי של Anthropic לתכנון נכון וארכיטקטורה של בניית סוכנים אפקטיביים",
//     link: "https://www.anthropic.com/engineering/building-effective-agents",
//     duration: "קריאה",
//     language: "אנגלית",
//     technologies: "Agent Architecture",
//     rating: "⭐⭐⭐⭐⭐",
//   },
//   {
//     id: "r6",
//     title: "מערכות RAG - הדרכה בעברית",
//     description:
//       "הדרכה מעמיקה ומעולה על הטמעת מערכות RAG לאחזור מידע מבוסס הקשר",
//     link: "https://www.youtube.com/watch?v=7oQg8kVVXRg",
//     duration: "13 דקות",
//     language: "עברית",
//     technologies: "RAG",
//     rating: "⭐⭐⭐⭐⭐",
//   },
//   {
//     id: "r7",
//     title: "קורס מקיף - RAG וסוכנים",
//     description: "קורס מלא וארוך להבנה ולפיתוח של מערכות RAG וסוכנים",
//     link: "https://www.youtube.com/watch?v=9c48sMot1gA",
//     duration: "8 שעות",
//     language: "אנגלית",
//     technologies: "RAG, Agents",
//     rating: "⭐⭐⭐⭐",
//   },
//   {
//     id: "r8",
//     title: "Context7 - כלי MCP",
//     description:
//       "פריימוורק שעוזר למודל השפה למשוך ולקרוא דוקומנטציה עדכנית לכל שפת תכנות",
//     link: "https://context7.com/",
//     duration: "כלי/אתר",
//     language: "אנגלית",
//     technologies: "MCP, LLM Context",
//     rating: "⭐⭐⭐⭐",
//   },
//   {
//     id: "r9",
//     title: "בניית אייג'נט והטמעת MCP - GeekAcademy",
//     description: "סרטון הדרכה בעברית המסביר על בניית אייג'נט והטמעת חיבורי MCP",
//     link: "https://www.youtube.com/watch?v=d0Bt3Z8Mucg",
//     duration: "שעתיים",
//     language: "עברית",
//     technologies: "Agents, MCP",
//     rating: "⭐⭐⭐⭐",
//   },
//   {
//     id: "r10",
//     title: "פיתוח כלי דמוי Claude Code",
//     description:
//       "הסרטה מקיפה מאד שמראה תהליך פיתוח מאפס של כלי דמוי Claude Code",
//     link: "https://www.youtube.com/watch?v=3GjE_YAs03s",
//     duration: "19 שעות",
//     language: "אנגלית",
//     technologies: "AI Development",
//     rating: "⭐⭐⭐⭐",
//   },
//   {
//     id: "r11",
//     title: "N8N - אוטומציה ותזמור Workflows",
//     description:
//       "מאמר המסביר על כלי האוטומציה N8N לאירוח ותזמור workflows של סוכנים",
//     link: "https://bizfly.co.il/blog/n8n-guide",
//     duration: "מאמר",
//     language: "עברית",
//     technologies: "N8N, Automation",
//     rating: "⭐⭐⭐⭐",
//   },
//   {
//     id: "r12",
//     title: "OpenAI Agent Builder",
//     description:
//       "הפלטפורמה הרשמית של OpenAI לבנייה ותצורה מהירה של סוכנים (GPTs)",
//     link: "https://platform.openai.com/agent-builder",
//     duration: "אתר",
//     language: "אנגלית",
//     technologies: "OpenAI",
//     rating: "⭐⭐⭐⭐⭐",
//   },
//   {
//     id: "r13",
//     title: "AI Cookbook - דוגמאות קוד",
//     description:
//       "מאגר קוד ב-Github עם דוגמאות קוד לתבניות עבודה של תזמור סוכנים",
//     link: "https://github.com/daveebbelaar/ai-cookbook",
//     duration: "קוד",
//     language: "אנגלית",
//     technologies: "Python, Agent Workflows",
//     rating: "⭐⭐⭐",
//   },
//   {
//     id: "r14",
//     title: "AWS Skill Builder - יסודות ענן",
//     description:
//       "קורס יסודות חינמי של סביבת הענן של AWS. היכרות עם התשתית עליה מריצים מודלי נתונים",
//     link: "https://skillbuilder.aws/",
//     duration: "קצר",
//     language: "עברית",
//     technologies: "AWS, Cloud",
//     rating: "⭐⭐⭐⭐",
//   },
// ];

export default function DocsPage() {
  // const [searchQuery] = useState("");
  // const [recommendedSearchQuery] = useState("");

  // Filter cards based on search query
  // const filteredCards = useMemo(() => {
  //   if (!searchQuery.trim()) {
  //     return guideCards;
  //   }

  //   const query = searchQuery.toLowerCase();
  //   return guideCards.filter(
  //     (card) =>
  //       card.title.toLowerCase().includes(query) ||
  //       card.description.toLowerCase().includes(query) ||
  //       card.category.toLowerCase().includes(query),
  //   );
  // }, [searchQuery]);

  // Filter recommended guides based on search query
  // const filteredRecommendedGuides = useMemo(() => {
  //   if (!recommendedSearchQuery.trim()) {
  //     return recommendedGuides;
  //   }

  //   const query = recommendedSearchQuery.toLowerCase();
  //   return recommendedGuides.filter(
  //     (guide) =>
  //       guide.title.toLowerCase().includes(query) ||
  //       guide.description.toLowerCase().includes(query) ||
  //       guide.technologies.toLowerCase().includes(query) ||
  //       guide.language.toLowerCase().includes(query),
  //   );
  // }, [recommendedSearchQuery]);

  return (
    <div className="docs-page">
      <div className="docs-container">
        <div className="docs-header">
          <h1>📚 מדריכי שימוש</h1>
          <p className="docs-subtitle">מרכז הידע של SafeAI</p>
        </div>

        {/* Beta Notice */}
        <div className="beta-notice">
          <div className="beta-notice-icon">🚧</div>
          <div className="beta-notice-content">
            <h3>המערכת בשלב הקמה</h3>
            <p>
              כרגע המדריכים נמצאים בתיקיית Google Drive שלנו בפורמט וידאו.
              <br />
              אנחנו עובדים על שיפור חוויית המשתמש ובקרוב נוסיף מדריכים נוספים
              ותכנים מתקדמים.
            </p>
            <a
              href="https://drive.google.com/drive/folders/1-x8qSkCQRWxfIGyNzjszUW_u3eiggY8b?usp=drive_link"
              target="_blank"
              rel="noopener noreferrer"
              className="drive-link-button"
            >
              📂 גישה לתיקיית המדריכים המלאה
            </a>
          </div>
        </div>

        {/* Search Bar */}
        {/* <div className="search-bar">
          <input
            type="text"
            placeholder="חיפוש חופשי במדריכים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button className="search-button">🔍</button>
        </div> */}

        {/* Guide Cards */}
        {/* <div className="guides-grid">
          {filteredCards.length > 0 ? (
            filteredCards.map((card) => (
              <a
                key={card.id}
                href={card.link}
                target="_blank"
                rel="noopener noreferrer"
                className="guide-card"
              >
                <div className="guide-card-header">
                  <span className="guide-category">{card.category}</span>
                </div>
                <h3 className="guide-title">{card.title}</h3>
                <p className="guide-description">{card.description}</p>
                <div className="guide-card-footer">
                  <span className="guide-link-text">צפה במדריך →</span>
                </div>
              </a>
            ))
          ) : (
            <div className="no-results">
              <span className="no-results-icon">🔍</span>
              <p>לא נמצאו תוצאות עבור "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery("")}
                className="clear-search-button"
              >
                נקה חיפוש
              </button>
            </div>
          )}
        </div> */}

        {/* Recommended Guides Section */}
        {/* <div className="recommended-guides-section">
          <div className="recommended-header">
            <h2>🎓 מדריכים מומלצים ללמידה כללית</h2>
            <p className="recommended-subtitle">
              מדריכים איכותיים שנבחרו בקפידה לפיתוח, הטמעה ולמידה של  AI למפתחים
            </p>
            <div className="curator-info">
              <div className="curator-details">
                <strong>נערך על ידי: מרים קנר</strong>
                <p className="curator-tagline">
                  צרו קשר לפיתוח, הטמעה והנחיית AI בארגון שלכם
                </p>

                <a
                  href="mailto:m0534147159@gmail.com"
                  className="curator-email"
                >
                  m0534147159@gmail.com | 053-414-7159
                </a>
              </div>
            </div>
          </div>

          <div className="load-all-guides-container">
            <a href="/recommended-guides" className="load-all-guides-button">
              🎓 צפה בכל המדריכים המומלצים ({recommendedGuides.length}+ מדריכים)
            </a>
      
                <a
              href="https://docs.google.com/spreadsheets/d/1I8y1bH400KnpkcD1q-gGYjy-uM__i3Xs-MFqc9uJakY/edit?gid=593094152#gid=593094152"
              target="_blank"
              rel="noopener noreferrer"
              className="resource-link"
            >
              📊 טבלת המדריכים המלאה (Excel)
            </a>
          </div>

  
        </div> */}

        {/* Additional Resources */}
        <div className="additional-resources">
          <h2>משאבים נוספים</h2>
          <div className="resources-list">
        
            <a href="/contact" className="resource-link">
              💬 צור קשר לתמיכה
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
