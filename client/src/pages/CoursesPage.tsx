import { SEO } from "../components/SEO";
import "../styles/courses-page.css";

export default function CoursesPage() {
  return (
    <div className="courses-page">
        <SEO
        title="קורסים והדרכות AI"
        description="למדו להפיק את המקסימום מ-SafeAI613. מגוון מסלולי הכשרה: קורס מתחילים, שימוש מתקדם בפילטרים, ניהול משתמשים ארגוני וחיבור מערכות דרך אינטגרציה ו-API."
        keywords="קורס AI, לימודי בינה מלאכותית, מדריכי SafeAI, ניהול ארגוני SafeAI, קורס API"
        canonicalUrl="https://safeai613.com/courses"
      />
      <div className="courses-container">
        <div className="courses-header">
          <h1>🎓 קורסים והדרכות</h1>
          <p className="courses-subtitle">למד להשתמש ב-SafeAI בצורה המיטבית</p>
        </div>

        <div className="courses-content">
          <div className="coming-soon-card">
            <div className="icon-wrapper">
              <span className="icon">🚀</span>
            </div>
            <h2>בקרוב - קורסים מקצועיים!</h2>
            <p className="main-description">
              אנחנו מכינים עבורכם סדרת קורסים מקיפה שתעזור לכם להפיק את המקסימום מ-SafeAI
            </p>

            <div className="future-courses">
              <div className="course-preview">
                <div className="course-icon">📘</div>
                <h3>קורס מתחילים</h3>
                <p>היכרות ראשונית עם המערכת והתחלת עבודה</p>
              </div>

              <div className="course-preview">
                <div className="course-icon">📗</div>
                <h3>קורס מתקדמים</h3>
                <p>שימוש מתקדם בפילטרים ופרופילים</p>
              </div>

              <div className="course-preview">
                <div className="course-icon">📕</div>
                <h3>ניהול ארגוני</h3>
                <p>ניהול משתמשים והרשאות בארגון</p>
              </div>

              <div className="course-preview">
                <div className="course-icon">📙</div>
                <h3>אינטגרציה ו-API</h3>
                <p>חיבור SafeAI למערכות קיימות</p>
              </div>
            </div>

            <div className="notify-section">
              <p>רוצה לקבל עדכון כשהקורסים יהיו זמינים?</p>
              <div className="notify-form">
                <input 
                  type="email" 
                  placeholder="כתובת המייל שלך" 
                  disabled 
                />
                <button disabled>הודע לי</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
