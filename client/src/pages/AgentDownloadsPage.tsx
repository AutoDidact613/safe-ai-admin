import { useState } from "react";
import "../styles/agent-downloads-page.css";

export default function AgentDownloadsPage() {
  type Section = "home" | "downloads" | "guide" | "pricing";

  const [activeSection, setActiveSection] = useState<Section>("home");

  return (
    <>
      <nav className="dashboard-sub-nav">
        <div className="sub-nav-container">
          <>
            <a href="#home" style={{ textDecoration: "none" }}>
              <button
                className={activeSection === "home" ? "sub-nav-btn active" : "sub-nav-btn"}
                onClick={() => setActiveSection("home")}
              >
                דף הבית
              </button>
            </a>
            <a href="#downloads" style={{ textDecoration: "none" }}>
              <button
                className={activeSection === "downloads" ? "sub-nav-btn active" : "sub-nav-btn"}
                onClick={() => setActiveSection("downloads")}
              >
                הורדה
              </button>
            </a>
            <a href="#guide" style={{ textDecoration: "none" }}>
              <button
                className={activeSection === "guide" ? "sub-nav-btn active" : "sub-nav-btn"}
                onClick={() => setActiveSection("guide")}
              >
                מדריך
              </button>
            </a>
            <a href="#pricing" style={{ textDecoration: "none" }}>
              <button
                className={activeSection === "pricing" ? "sub-nav-btn active" : "sub-nav-btn"}
                onClick={() => setActiveSection("pricing")}
              >
                מחירון
              </button>
            </a>
          </>
        </div>
      </nav>

      {/* ===== HOME ===== */}
      <div id="home" className="page-section hero-section">
        <div className="hero-copy">
          <span className="eyebrow">SafeAI Desktop</span>
          <h1>AI שמדבר רק בשפה שלך</h1>
          <p>
            הורד את SafeAI-Agents לדסקטופ, בחר פרופיל מקצועי — ותקבל צ'אט חכם שעונה
            אך ורק על שאלות בתחום שבחרת. פחות רעש, יותר דיוק.
          </p>
          <div className="hero-actions">
            <a href="#downloads" className="primary-btn">הורדה עכשיו</a>
            <a href="#guide" className="secondary-btn">איך זה עובד?</a>
          </div>
        </div>
        <div className="hero-preview">
          <div className="preview-card">
            <p className="preview-label">פרופילים לדוגמא:</p>
            <ul className="preview-list">
              <li>Program — שאלות קוד ופיתוח תוכנה</li>
              <li>Architect — תכנון מערכות וארכיטקטורה</li>
              <li>Analyst — ניתוח נתונים ודוחות עסקיים</li>
              <li>Writer — כתיבה מקצועית ותוכן שיווקי</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ===== DOWNLOADS ===== */}
      <div id="downloads" className="page-section download-section">
        <div className="section-header">
          <span className="section-label">הורדה</span>
          <h2>הורד, בחר פרופיל והתחל לעבוד</h2>
          <p>
            מורידים את SafeAI-Agents פעם אחת — ובכל הפעלה בוחרים פרופיל שמגדיר
            את תחום השיחה. הצ'אט ישאר ממוקד ולא יסטה לנושאים אחרים.
          </p>
        </div>

        {/* פרופילים (ללא כפתורי הורדה פנימיים) */}
        {/* <div className="download-cards" style={{ marginBottom: "48px" }}>
          <article className="download-card">
            <h3>Program</h3>
            <p>
              פרופיל לפיתוח תוכנה — עונה רק על שאלות קוד, באגים וטכנולוגיות.
              מושלם למפתחים שרוצים תשובות ישירות בלי סטיות.
            </p>
            <ul>
              <li>כתיבה ובדיקת קוד</li>
              <li>ניפוי תקלות</li>
              <li>המלצות טכנולוגיות</li>
            </ul>
          </article>
          
          <article className="download-card">
            <h3>Architect</h3>
            <p>
              פרופיל לתכנון מערכות — מתמחה בארכיטקטורה, בחירת טכנולוגיות
              ותכנון נכון מהיסוד.
            </p>
            <ul>
              <li>סקירת ארכיטקטורת מערכת</li>
              <li>בחירת Stack מתאים</li>
              <li>תכנון לסקיילביליות</li>
            </ul>
          </article>

          <article className="download-card">
            <h3>Analyst</h3>
            <p>
              פרופיל לניתוח נתונים — עונה על שאלות בנושא מגמות, תובנות עסקיות
              והפקת דוחות ברורים.
            </p>
            <ul>
              <li>עיבוד וניתוח נתונים</li>
              <li>הפקת תובנות פעילות</li>
              <li>סיכומים ודוחות חכמים</li>
            </ul>
          </article>
        </div> */}

        {/* כפתורי הורדה לפי מערכת הפעלה (Windows / Linux) */}
        <div className="download-os-cards">
          <div className="download-card" style={{ textAlign: "center" }}>
            <div className="os-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="#10a37f">
                <path d="M0 3.449L9.75 2.1v9.45H0V3.449zM0 12.45h9.75v9.45L0 20.551v-8.1zM10.8 1.95L24 0v11.55H10.8V1.95zM10.8 12.45H24v11.55l-13.2-1.95v-9.6z"/>
              </svg>
            </div>
            <h3>SafeAI-Agents ל-Windows</h3>
            <p>הורדה עבור Windows 10 / 11 (64-bit)</p>
            <a className="card-btn" href="#download-windows" style={{ margin: "0 auto" }}>
              הורד ל-Windows
            </a>
          </div>

          <div className="download-card" style={{ textAlign: "center" }}>
            <div className="os-icon" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg" 
                alt="Linux Tux" 
                style={{ width: '42px', height: '42px', objectFit: 'contain' }} 
              />
            </div>
            <h3>SafeAI-Agents ל-Linux</h3>
            <p>הורדה עבור הפצות אובונטו ולינוקס (AppImage / Deb)</p>
            <a className="card-btn" href="#download-linux" style={{ margin: "0 auto" }}>
              הורד ל-Linux
            </a>
          </div>
        </div>
      </div>

      {/* ===== GUIDE ===== */}
      <div id="guide" className="page-section guide-section">
        <div className="section-header">
          <span className="section-label">מדריך</span>
          <h2>איך SafeAI-Agents עובד?</h2>
          <p>
            בניגוד לצ'אטבוטים כלליים, SafeAI-Agents נשאר בתוך גבולות התחום שבחרת.
            כך תוכל לקבל תשובות מדויקות, ממוקדות ורלוונטיות — בכל שיחה.
          </p>
        </div>
        <div className="guide-grid">
          <div className="guide-card">
            <h3>1. הורד את האפליקציה</h3>
            <p>
              תהליך התקנה פשוט ומהיר — SafeAI-Agents רץ ישירות על המחשב שלך
              ללא צורך בהגדרות מסובכות.
            </p>
          </div>
          <div className="guide-card">
            <h3>2. בחר פרופיל</h3>
            <p>
              בכל הפעלה תבחר פרופיל לדוגמא: Program, Architect, Analyst או Writer.
              הפרופיל קובע על אילו שאלות ה-AI יענה.
            </p>
          </div>
          <div className="guide-card">
            <h3>3. שוחח בתחום שלך</h3>
            <p>
              ה-AI עונה אך ורק על שאלות בתחום הפרופיל הנבחר.
              שאלות מחוץ לתחום — יופנו בנימוס חזרה לנושא.
            </p>
          </div>
          <div className="guide-card">
            <h3>4. תוצאות ממוקדות</h3>
            <p>
              ריכוז בתחום אחד מבטיח שימוש ממוקד ובטוח, תשובות עמוקות ומדויקות.
            </p>
          </div>
        </div>
      </div>

      {/* ===== PRICING ===== */}
      <div id="pricing" className="page-section pricing-section">
        <div className="section-header">
          <span className="section-label">מחירון</span>
          <h2>בחר חבילה שמתאימה לך</h2>
          <p>
            כל החבילות כוללות גישה לאפליקציית SafeAI Desktop.
            ההבדל הוא במספר הפרופילים, כמות השיחות ורמת התמיכה.
          </p>
        </div>
        <div className="pricing-grid">
          <article className="pricing-card">
            <h3>Free</h3>
            <p>
              מתאים לכל מי שרוצה לגלות את הערך של AI ממוקד לפני שמתחייב.
            </p>
            <ul>
              <li>גישה לפרופיל אחד לבחירה</li>
              <li>עד 10 שיחות יומיות</li>
              <li>עדכוני אפליקציה אוטומטיים</li>
            </ul>
            <a className="card-btn" href="#download">התחל בחינם</a>
          </article>
          
          <article className="pricing-card featured-card">
            <h3>Pro</h3>
            <p>
              למקצוענים שעובדים עם SafeAI על בסיס יומי ורוצים גישה מלאה.
            </p>
            <ul>
              <li>גישה לכל הפרופילים</li>
              <li>שיחות ללא הגבלה</li>
              <li>תמיכה פרימיום</li>
            </ul>
            <a className="card-btn" href="#download">בחר Pro</a>
          </article>
          
          <article className="pricing-card">
            <h3>Team</h3>
            <p>
              לצוותים שרוצים לעבוד עם אותם פרופילים ולשמור על אחידות בעבודה.
            </p>
            <ul>
              <li>מספר משתמשים</li>
              <li>ניהול פרופילים משותפים</li>
              <li>לוח בקרה לצוות</li>
            </ul>
            <a className="card-btn" href="#download">בחר Team</a>
          </article>
        </div>
      </div>
    </>
  );
}