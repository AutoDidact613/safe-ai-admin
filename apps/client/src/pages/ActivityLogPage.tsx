import "../styles/activity-log-page.css";

export default function ActivityLogPage() {
  // Mock data - in the future this will come from the database
  const mockActivities = [
    {
      id: 1,
      type: "user_login",
      title: "התחברות משתמש",
      description: "משתמש התחבר למערכת",
      timestamp: "לפני 5 דקות",
      icon: "🔐",
      color: "#4caf50"
    },
    {
      id: 2,
      type: "profile_created",
      title: "פרופיל חדש נוצר",
      description: "פרופיל 'בטיחות מתקדמת' נוסף למערכת",
      timestamp: "לפני 23 דקות",
      icon: "✨",
      color: "#2196f3"
    },
    {
      id: 3,
      type: "api_request",
      title: "בקשת API",
      description: "1,247 בקשות API בוצעו בשעה האחרונה",
      timestamp: "לפני שעה",
      icon: "📡",
      color: "#ff9800"
    },
    {
      id: 4,
      type: "filter_updated",
      title: "פילטר עודכן",
      description: "פילטר 'תוכן רגיש' עודכן בהצלחה",
      timestamp: "לפני 2 שעות",
      icon: "🔧",
      color: "#9c27b0"
    },
    {
      id: 5,
      type: "user_registered",
      title: "משתמש חדש נרשם",
      description: "משתמש חדש הצטרף לארגון",
      timestamp: "לפני 3 שעות",
      icon: "👤",
      color: "#00bcd4"
    },
    {
      id: 6,
      type: "system_update",
      title: "עדכון מערכת",
      description: "המערכת עודכנה לגרסה 2.1.0",
      timestamp: "לפני 5 שעות",
      icon: "🚀",
      color: "#f44336"
    }
  ];

  return (
    <div className="activity-log-page">
      <div className="activity-container">
        <div className="activity-header">
          <h1>📊 לוג פעילות SafeAI</h1>
          <p className="activity-subtitle">מעקב אחר כל הפעילויות במערכת</p>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>1,234</h3>
              <p>משתמשים פעילים</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <h3>45,678</h3>
              <p>בקשות היום</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <h3>99.9%</h3>
              <p>זמינות מערכת</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🛡️</div>
            <div className="stat-info">
              <h3>156</h3>
              <p>איומים נחסמו</p>
            </div>
          </div>
        </div>

        <div className="activity-content">
          <div className="activity-list-header">
            <h2>פעילות אחרונה</h2>
            <p className="note">* הנתונים המוצגים הם לדוגמה ויישאבו מהדאטהבייס בעתיד</p>
          </div>

          <div className="activity-list">
            {mockActivities.map((activity) => (
              <div key={activity.id} className="activity-card">
                <div 
                  className="activity-icon-wrapper" 
                  style={{ backgroundColor: activity.color }}
                >
                  <span className="activity-icon">{activity.icon}</span>
                </div>
                <div className="activity-details">
                  <h3>{activity.title}</h3>
                  <p>{activity.description}</p>
                  <span className="activity-timestamp">{activity.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
