import { useState } from "react";
import "../styles/agent-downloads-page.css";
// import { initialState } from "recharts/types/state/rootPropsSlice";

export default function AgentDownloadsPage() {

    type Section =
  | "home"
  | "downloads"
  | "guide"
  | "pricing";

  const [activeSection, setActiveSection] = useState<Section>("home");

    return (<>
        <nav className="dashboard-sub-nav">
          <div className="sub-nav-container">
            {/* {userRole === "user" && ( */}
              <>
                <a href="#home" style={{ textDecoration: "none" }}>
                  <button
                    className={
                      activeSection === "home"
                        ? "sub-nav-btn active"
                        : "sub-nav-btn"
                    }
                  onClick={() => setActiveSection("home")}
                >
                  דף הבית
                  </button>
                </a>
                <a href="#downloads" style={{ textDecoration: "none" }}>
                  <button
                    className={
                      activeSection === "downloads"
                        ? "sub-nav-btn active"
                        : "sub-nav-btn"
                    }
                    onClick={() => setActiveSection("downloads")}
                  >
                    הורדה
                  </button>
                </a>
                <a href="#guide" style={{ textDecoration: "none" }}>
                  <button
                    className={
                      activeSection === "guide"
                        ? "sub-nav-btn active"
                        : "sub-nav-btn"
                    }
                    onClick={() => setActiveSection("guide")}
                  >
                    מדריך
                  </button>
                </a>
                <a href="#pricing" style={{ textDecoration: "none" }}>
                  <button
                    className={
                      activeSection === "pricing"
                        ? "sub-nav-btn active"
                        : "sub-nav-btn"
                    }
                    onClick={() => setActiveSection("pricing")}
                  >
                    מחירון
                  </button>
                </a>
              </>
            {/* )} */}            
            </div>
        </nav>
        <div id="home" className="page-section hero-section">
          <div className="hero-copy">
            <span className="eyebrow">Desktop Agent Suite</span>
            <h1>הורד את אפליקציית SafeAI לדסקטופ</h1>
            <p>בחר פרופיל סוכן לפי תחום מומחיות והתחל שיחה ממוקדת בנושאים כמו תוכנה, ארכיטקטורה, ניתוח וכתיבה.</p>
            <div className="hero-actions">
              <a href="#downloads" className="primary-btn">הורדה עכשיו</a>
              <a href="#guide" className="secondary-btn">למד עוד</a>
            </div>
          </div>
          <div className="hero-preview">
            <div className="preview-card">
              <p className="preview-label">Profiles</p>
              <ul className="preview-list">
                <li>Program — פתרונות קוד וטכנולוגיה</li>
                <li>Architect — תכנון מערכות וחוויית משתמש</li>
                <li>Analyst — ניתוח נתונים ודוחות חכמים</li>
                <li>Writer — תוכן מקצועי ומסרים ממוקדים</li>
              </ul>
            </div>
          </div>
        </div>
        <div id="downloads" className="page-section download-section">
          <div className="section-header">
            <span className="section-label">הורדה</span>
            <h2>התחל עם פרופיל סוכן מוכן</h2>
            <p>התקן את האפליקציה על המחשב וקבל חוויה שמכוונת לכל נושא מקצועי.</p>
          </div>
          <div className="download-cards">
            <article className="download-card">
              <h3>Program</h3>
              <p>סוכן תוכנה יעזור לך לכתוב קוד, לתקן באגים ולפתח פרויקטים מהר יותר.</p>
              <ul>
                <li>בדיקות קוד</li>
                <li>ניפוי תקלות</li>
                <li>המלצות פרקטיות</li>
              </ul>
              <a className="card-btn" href="#download">הורד Desktop</a>
            </article>
            <article className="download-card">
              <h3>Architect</h3>
              <p>סוכן ארכיטקטורה מתכנן מערכות חכמות ונותן תמיכה בתכנון ארכיטקטוני.</p>
              <ul>
                <li>סקירת מערכות</li>
                <li>בחירת טכנולוגיות</li>
                <li>תכנון נכון</li>
              </ul>
              <a className="card-btn" href="#download">הורד Desktop</a>
            </article>
            <article className="download-card">
              <h3>Analyst</h3>
              <p>סוכן ניתוח נתונים מנתח מגמות, מסכם תוצאות ומייצר דוחות חכמים.</p>
              <ul>
                <li>עיבוד נתונים</li>
                <li>הפקת תובנות</li>
                <li>הצגת נתונים ברורה</li>
              </ul>
              <a className="card-btn" href="#download">הורד Desktop</a>
            </article>
          </div>
        </div>
        <div id="guide" className="page-section guide-section">
          <div className="section-header">
            <span className="section-label">מדריך</span>
            <h2>איך להשתמש באפליקציה</h2>
            <p>המסך המרכזי מוביל אותך אל פרופיל סוכן יחודי, כך שכל צ'אט נשאר בתוך התחום הנבחר.</p>
          </div>
          <div className="guide-grid">
            <div className="guide-card">
              <h3>בחר פרופיל</h3>
              <p>התחל עם Program, Architect או Analyst כדי לשוחח בתחום הרלוונטי.</p>
            </div>
            <div className="guide-card">
              <h3>שוחח רק בנושא</h3>
              <p>המערכת שומרת את השיחות בתוך תחום הפרופיל כדי שתוכל לקבל תשובות מדויקות יותר.</p>
            </div>
            <div className="guide-card">
              <h3>דסקטופ מהיר</h3>
              <p>הגדרות תוכנה, קבצים ושיחות מעודכנות ישירות מתוך המחשב.</p>
            </div>
            <div className="guide-card">
              <h3>תוצאות ממוקדות</h3>
              <p>כל פרופיל מספק המלצות שמתאימות למשימות מקצועיות.</p>
            </div>
          </div>
        </div>
        <div id="pricing" className="page-section pricing-section">
          <div className="section-header">
            <span className="section-label">מחירון</span>
            <h2>בחר חבילה שמתאימה לצרכים שלך</h2>
            <p>קבל גישה לפרופילים, שיחות ודרכי עבודה מקצועיות לפי רמת השימוש שלך.</p>
          </div>
          <div className="pricing-grid">
            <article className="pricing-card">
              <h3>Free</h3>
              <p>מתאים למתחילים שרוצים לבדוק את הסוכנים ולהתחיל לעבוד.</p>
              <ul>
                <li>גישה לפרופיל Program</li>
                <li>עד 3 צ'אטים יומיים</li>
                <li>עדכוני אפליקציה אוטומטיים</li>
              </ul>
              <a className="card-btn" href="#download">בחר חינם</a>
            </article>
            <article className="pricing-card featured-card">
              <h3>Pro</h3>
              <p>למקצוענים שזקוקים ליותר פרופילים, מהירות וזמינות.</p>
              <ul>
                <li>גישה לכל הפרופילים</li>
                <li>שיחות בלתי מוגבלות</li>
                <li>תמיכה פרימיום</li>
              </ul>
              <a className="card-btn" href="#download">בחר מקצועי</a>
            </article>
            <article className="pricing-card">
              <h3>Team</h3>
              <p>לקבוצות שרוצות לשתף פרופילים, תרחישים ופרויקטים.</p>
              <ul>
                <li>הוספת משתמשים</li>
                <li>ניהול צוותי עבודה</li>
                <li>גישה עסקית</li>
              </ul>
              <a className="card-btn" href="#download">בחר צוות</a>
            </article>
          </div>
        </div>
        </>
      )
}