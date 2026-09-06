import { useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/agent-downloads-page.css";
// import { initialState } from "recharts/types/state/rootPropsSlice";

export default function AgentDownloadsPage() {
    const { t } = useTranslation();

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
                  {t("nav.homePage")}
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
                    {t("agentDownloads.navDownloads")}
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
                    {t("agentDownloads.navGuide")}
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
                    {t("agentDownloads.navPricing")}
                  </button>
                </a>
              </>
            {/* )} */}
            </div>
        </nav>
        <div id="home" className="page-section hero-section">
          <div className="hero-copy">
            <span className="eyebrow">Desktop Agent Suite</span>
            <h1>{t("agentDownloads.heroTitle")}</h1>
            <p>{t("agentDownloads.heroSubtitle")}</p>
            <div className="hero-actions">
              <a href="#downloads" className="primary-btn">{t("agentDownloads.downloadNowBtn")}</a>
              <a href="#guide" className="secondary-btn">{t("agentDownloads.learnMoreBtn")}</a>
            </div>
          </div>
          <div className="hero-preview">
            <div className="preview-card">
              <p className="preview-label">Profiles</p>
              <ul className="preview-list">
                <li>{t("agentDownloads.profileProgram")}</li>
                <li>{t("agentDownloads.profileArchitect")}</li>
                <li>{t("agentDownloads.profileAnalyst")}</li>
                <li>{t("agentDownloads.profileWriter")}</li>
              </ul>
            </div>
          </div>
        </div>
        <div id="downloads" className="page-section download-section">
          <div className="section-header">
            <span className="section-label">{t("agentDownloads.navDownloads")}</span>
            <h2>{t("agentDownloads.downloadsSectionTitle")}</h2>
            <p>{t("agentDownloads.downloadsSectionDesc")}</p>
          </div>
          <div className="download-cards">
            <article className="download-card">
              <h3>Program</h3>
              <p>{t("agentDownloads.programCardDesc")}</p>
              <ul>
                <li>{t("agentDownloads.programFeature1")}</li>
                <li>{t("agentDownloads.programFeature2")}</li>
                <li>{t("agentDownloads.programFeature3")}</li>
              </ul>
              <a className="card-btn" href="#download">{t("agentDownloads.downloadDesktopBtn")}</a>
            </article>
            <article className="download-card">
              <h3>Architect</h3>
              <p>{t("agentDownloads.architectCardDesc")}</p>
              <ul>
                <li>{t("agentDownloads.architectFeature1")}</li>
                <li>{t("agentDownloads.architectFeature2")}</li>
                <li>{t("agentDownloads.architectFeature3")}</li>
              </ul>
              <a className="card-btn" href="#download">{t("agentDownloads.downloadDesktopBtn")}</a>
            </article>
            <article className="download-card">
              <h3>Analyst</h3>
              <p>{t("agentDownloads.analystCardDesc")}</p>
              <ul>
                <li>{t("agentDownloads.analystFeature1")}</li>
                <li>{t("agentDownloads.analystFeature2")}</li>
                <li>{t("agentDownloads.analystFeature3")}</li>
              </ul>
              <a className="card-btn" href="#download">{t("agentDownloads.downloadDesktopBtn")}</a>
            </article>
          </div>
        </div>
        <div id="guide" className="page-section guide-section">
          <div className="section-header">
            <span className="section-label">{t("agentDownloads.navGuide")}</span>
            <h2>{t("agentDownloads.guideSectionTitle")}</h2>
            <p>{t("agentDownloads.guideSectionDesc")}</p>
          </div>
          <div className="guide-grid">
            <div className="guide-card">
              <h3>{t("agentDownloads.guideStep1Title")}</h3>
              <p>{t("agentDownloads.guideStep1Desc")}</p>
            </div>
            <div className="guide-card">
              <h3>{t("agentDownloads.guideStep2Title")}</h3>
              <p>{t("agentDownloads.guideStep2Desc")}</p>
            </div>
            <div className="guide-card">
              <h3>{t("agentDownloads.guideStep3Title")}</h3>
              <p>{t("agentDownloads.guideStep3Desc")}</p>
            </div>
            <div className="guide-card">
              <h3>{t("agentDownloads.guideStep4Title")}</h3>
              <p>{t("agentDownloads.guideStep4Desc")}</p>
            </div>
          </div>
        </div>
        <div id="pricing" className="page-section pricing-section">
          <div className="section-header">
            <span className="section-label">{t("agentDownloads.navPricing")}</span>
            <h2>{t("agentDownloads.pricingSectionTitle")}</h2>
            <p>{t("agentDownloads.pricingSectionDesc")}</p>
          </div>
          <div className="pricing-grid">
            <article className="pricing-card">
              <h3>Free</h3>
              <p>{t("agentDownloads.freeCardDesc")}</p>
              <ul>
                <li>{t("agentDownloads.freeFeature1")}</li>
                <li>{t("agentDownloads.freeFeature2")}</li>
                <li>{t("agentDownloads.freeFeature3")}</li>
              </ul>
              <a className="card-btn" href="#download">{t("agentDownloads.chooseFreeBtn")}</a>
            </article>
            <article className="pricing-card featured-card">
              <h3>Pro</h3>
              <p>{t("agentDownloads.proCardDesc")}</p>
              <ul>
                <li>{t("agentDownloads.proFeature1")}</li>
                <li>{t("agentDownloads.proFeature2")}</li>
                <li>{t("agentDownloads.proFeature3")}</li>
              </ul>
              <a className="card-btn" href="#download">{t("agentDownloads.chooseProBtn")}</a>
            </article>
            <article className="pricing-card">
              <h3>Team</h3>
              <p>{t("agentDownloads.teamCardDesc")}</p>
              <ul>
                <li>{t("agentDownloads.teamFeature1")}</li>
                <li>{t("agentDownloads.teamFeature2")}</li>
                <li>{t("agentDownloads.teamFeature3")}</li>
              </ul>
              <a className="card-btn" href="#download">{t("agentDownloads.chooseTeamBtn")}</a>
            </article>
          </div>
        </div>
        </>
      )
}
