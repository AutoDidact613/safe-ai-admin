import { useTranslation } from "react-i18next";
import "../styles/courses-page.css";

export default function CoursesPage() {
  const { t } = useTranslation();
  return (
    <div className="courses-page">
      <div className="courses-container">
        <div className="courses-header">
          <h1>🎓 {t("courses.title")}</h1>
          <p className="courses-subtitle">{t("courses.subtitle")}</p>
        </div>

        <div className="courses-content">
          <div className="coming-soon-card">
            <div className="icon-wrapper">
              <span className="icon">🚀</span>
            </div>
            <h2>{t("courses.comingSoon")}</h2>
            <p className="main-description">
              {t("courses.description")}
            </p>

            <div className="future-courses">
              <div className="course-preview">
                <div className="course-icon">📘</div>
                <h3>{t("courses.beginnerTitle")}</h3>
                <p>{t("courses.beginnerDesc")}</p>
              </div>

              <div className="course-preview">
                <div className="course-icon">📗</div>
                <h3>{t("courses.advancedTitle")}</h3>
                <p>{t("courses.advancedDesc")}</p>
              </div>

              <div className="course-preview">
                <div className="course-icon">📕</div>
                <h3>{t("courses.managementTitle")}</h3>
                <p>{t("courses.managementDesc")}</p>
              </div>

              <div className="course-preview">
                <div className="course-icon">📙</div>
                <h3>{t("courses.apiTitle")}</h3>
                <p>{t("courses.apiDesc")}</p>
              </div>
            </div>

            <div className="notify-section">
              <p>{t("courses.notifyText")}</p>
              <div className="notify-form">
                <input 
                  type="email" 
                  placeholder={t("courses.emailPlaceholder")} 
                  disabled 
                />
                <button disabled>{t("courses.notifyButton")}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
