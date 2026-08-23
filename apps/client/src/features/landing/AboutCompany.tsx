export default function AboutCompany() {
  const guestVideoUrl = import.meta.env.VITE_GUEST_VIDEO_URL;
  
  return (
    <div className="about-company">
      <h2> זה לא עוד מערכת. &nbsp;זה פתרון מערכתי.</h2>
      
      {/* Video Section */}
      {guestVideoUrl && (
        <div className="about-section video-section">
          <h3>🎥 סרטון הסבר</h3>
          <div className="video-container">
            <iframe
              src={guestVideoUrl.replace('/view?usp=drive_link', '/preview')}
              width="100%"
              height="480"
              allow="autoplay"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
      
      <div className="about-section">
        <h3>🚀 קהילת קוד פתוח בהקמה</h3>
        <p>
          SafeAI 613 היא קהילת קוד פתוח בהקמה המתמקדת בפיתוח כלים וטכנולוגיות
          לסינון ושימוש בטוח בבינה מלאכותית. אנחנו מאמינים בשקיפות, שיתוף פעולה,
          וגישה פתוחה לטכנולוגיה שמאפשרת לכולם להשתמש ב-AI בצורה אחראית ובטוחה.
        </p>
      </div>

      <div className="about-section">
        <h3>💡 החזון שלנו</h3>
        <p>
          ליצור תשתית  של כלי קוד פתוח המאפשרים לכל ארגון, מוסד חינוכי
          או מפתח לשלב בינה מלאכותית בצורה בטוחה, מסוננת ומותאמת לערכים שלהם.
          אנחנו בונים את הכלים שיאפשרו שימוש נגיש ב-AI תוך שמירה על בטיחות,
          פרטיות ואתיקה.
        </p>
      </div>

      <div className="about-section">
        <h3>🛠️ הפרויקטים שלנו</h3>
        <p>
          הקהילה שלנו מפתחת מגוון פרויקטים בקוד פתוח - מפרוקסי סינון ושרתים, דרך
          SDK- לשפות תכנות שונות, ועד תוספים לסביבות פיתוח.<br/> כל הפרויקטים
          זמינים ב-GitHub ובעתיד יתועדו וייבנו בהתאמה כדי לאפשר לכל מפתח להצטרף ולתרום.
        </p>
      </div>

      <div className="about-section">
        <h3>🤝 הצטרפו אלינו</h3>
        <ul className="features-list">
          <li>🌟 קוד פתוח ושקוף - כל הפרויקטים זמינים ב-GitHub</li>
          {/* <li>📚 תיעוד מקיף ודוגמאות קוד מעשיות</li> */}
          <li>🔧 כלים מודולריים שניתן לשלב בקלות</li>
          <li>🌐 קהילה פעילה ותומכת של מפתחים</li>
          <li>🚀 פיתוח מתמיד ושיפורים קבועים</li>
        </ul>
      </div>

      <div className="about-section github-section">
        <h3>🔗 GitHub Organization</h3>
        <p>כל הפרויקטים שלנו זמינים בארגון שלנו ב-GitHub:</p>
        <div className="github-link">
          <a
            href="https://github.com/SafeAI613"
            target="_blank"
            rel="noopener noreferrer"
            className="github-button"
          >
            <span className="github-icon">⭐</span>
            github.com/SafeAI613
          </a>
        </div>
      </div>
    </div>
  );
}
