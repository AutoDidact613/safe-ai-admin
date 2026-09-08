import { useTranslation } from "react-i18next";
import "../styles/activity-log-page.css";

export default function ActivityLogPage() {
  const { t } = useTranslation();
  // Mock data - in the future this will come from the database
  const mockActivities = [
    {
      id: 1,
      type: "user_login",
      title: t("activityLog.mockLoginTitle"),
      description: t("activityLog.mockLoginDescription"),
      timestamp: t("activityLog.mockLoginTimestamp"),
      icon: "🔐",
      color: "#4caf50"
    },
    {
      id: 2,
      type: "profile_created",
      title: t("activityLog.mockNewProfileTitle"),
      description: t("activityLog.mockNewProfileDescription"),
      timestamp: t("activityLog.mockNewProfileTimestamp"),
      icon: "✨",
      color: "#2196f3"
    },
    {
      id: 3,
      type: "api_request",
      title: t("activityLog.mockApiRequestTitle"),
      description: t("activityLog.mockApiRequestDescription"),
      timestamp: t("activityLog.mockApiRequestTimestamp"),
      icon: "📡",
      color: "#ff9800"
    },
    {
      id: 4,
      type: "filter_updated",
      title: t("activityLog.mockFilterUpdatedTitle"),
      description: t("activityLog.mockFilterUpdatedDescription"),
      timestamp: t("activityLog.mockFilterUpdatedTimestamp"),
      icon: "🔧",
      color: "#9c27b0"
    },
    {
      id: 5,
      type: "user_registered",
      title: t("activityLog.mockNewUserTitle"),
      description: t("activityLog.mockNewUserDescription"),
      timestamp: t("activityLog.mockNewUserTimestamp"),
      icon: "👤",
      color: "#00bcd4"
    },
    {
      id: 6,
      type: "system_update",
      title: t("activityLog.mockSystemUpdateTitle"),
      description: t("activityLog.mockSystemUpdateDescription"),
      timestamp: t("activityLog.mockSystemUpdateTimestamp"),
      icon: "🚀",
      color: "#f44336"
    }
  ];

  return (
    <div className="activity-log-page">
      <div className="activity-container">
        <div className="activity-header">
          <h1>📊 {t("nav.activityLog")}</h1>
          <p className="activity-subtitle">{t("activityLog.subtitle")}</p>
        </div>

        <div className="stats-overview">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <h3>1,234</h3>
              <p>{t("nav.users")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-info">
              <h3>45,678</h3>
              <p>{t("nav.requestsToday")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <h3>99.9%</h3>
              <p>{t("activityLog.statUptimeLabel")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🛡️</div>
            <div className="stat-info">
              <h3>156</h3>
              <p>{t("activityLog.statThreatsLabel")}</p>
            </div>
          </div>
        </div>

        <div className="activity-content">
          <div className="activity-list-header">
            <h2>{t("activityLog.recentActivityHeading")}</h2>
            <p className="note">{t("activityLog.mockDataNote")}</p>
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
