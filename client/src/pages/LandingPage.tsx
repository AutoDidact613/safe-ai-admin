import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import "../styles/landing-page.css";
import AboutCompany from "../features/landing/AboutCompany";
import Products from "../features/landing/Products";

type Section = "about" | "products";

export default function LandingPage() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<Section>("about");

  const renderSection = () => {
    switch (activeSection) {
      case "about":
        return <AboutCompany />;
      case "products":
        return <Products />;
      default:
        return <AboutCompany />;
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <div className="landing-hero">
        <h1 className="hero-title">{t("landing.heroTitle")}</h1>
        <p className="hero-subtitle">
          {t("landing.heroSubtitle")}
        </p>
        <Link to="/become-org-owner" className="hero-org-owner-link">
          {t("landing.orgOwnerLinkText")}
        </Link>
      </div>

      {/* Section Navigation */}
      <nav className="landing-section-nav">
        <button
          id="guest-section"
          className={`section-nav-btn ${activeSection === "about" ? "active" : ""}`}
          onClick={() => setActiveSection("about")}
        >
          <div className="section-nav-icon">👤</div>
          <div className="section-nav-content">
            <div className="section-nav-title">{t("landing.guestNavTitle")}</div>
            <div className="section-nav-desc">{t("landing.guestNavDesc")}</div>
          </div>
        </button>
        <button
          id="developer-section"
          className={`section-nav-btn ${activeSection === "products" ? "active" : ""}`}
          onClick={() => setActiveSection("products")}
        >
          <div className="section-nav-icon">💻</div>
          <div className="section-nav-content">
            <div className="section-nav-title">{t("landing.devNavTitle")}</div>
            <div className="section-nav-desc">{t("landing.devNavDesc")}</div>
          </div>
        </button>
      </nav>

      {/* Content Section */}
      <div className="landing-content">{renderSection()}</div>
    </div>
  );
}