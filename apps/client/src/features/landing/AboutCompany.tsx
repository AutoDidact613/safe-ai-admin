import { useTranslation } from "react-i18next";

export default function AboutCompany() {
  const { t } = useTranslation();
  const guestVideoUrl = import.meta.env.VITE_GUEST_VIDEO_URL;

  return (
    <div className="about-company">
      <h2>{t("aboutCompany.heading")}</h2>

      {/* Video Section */}
      {guestVideoUrl && (
        <div className="about-section video-section">
          <h3>🎥 {t("aboutCompany.videoSectionTitle")}</h3>
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
        <h3>🚀 {t("aboutCompany.communityTitle")}</h3>
        <p>
          {t("aboutCompany.communityP")}
        </p>
      </div>

      <div className="about-section">
        <h3>💡 {t("aboutCompany.visionTitle")}</h3>
        <p>
          {t("aboutCompany.visionP")}
        </p>
      </div>

      <div className="about-section">
        <h3>🛠️ {t("aboutCompany.projectsTitle")}</h3>
        <p>
          {t("aboutCompany.projectsPLine1")}<br/> {t("aboutCompany.projectsPLine2")}
        </p>
      </div>

      <div className="about-section">
        <h3>🤝 {t("aboutCompany.joinTitle")}</h3>
        <ul className="features-list">
          <li>🌟 {t("aboutCompany.joinFeature1")}</li>
          {/* <li>📚 תיעוד מקיף ודוגמאות קוד מעשיות</li> */}
          <li>🔧 {t("aboutCompany.joinFeature2")}</li>
          <li>🌐 {t("aboutCompany.joinFeature3")}</li>
          <li>🚀 {t("aboutCompany.joinFeature4")}</li>
        </ul>
      </div>

      <div className="about-section github-section">
        <h3>🔗 {t("aboutCompany.githubSectionTitle")}</h3>
        <p>{t("aboutCompany.githubSectionP")}</p>
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
