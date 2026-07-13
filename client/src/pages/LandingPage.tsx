import { useState } from "react";
import "../styles/landing-page.css";
import AboutCompany from "../features/landing/AboutCompany";
import Products from "../features/landing/Products";

type Section = "about" | "products";

export default function LandingPage() {
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
        <h1 className="hero-title">פתרונות בטוחים לשימוש ב-AI</h1>
        <p className="hero-subtitle">
          SafeAI מספקת פתרונות מתקדמים לניהול ובקרה של מודלים של בינה מלאכותית
        </p>
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
            <div className="section-nav-title">לאורח</div>
            <div className="section-nav-desc">מידע כללי על החברה</div>
          </div>
        </button>
        <button
          id="developer-section"
          className={`section-nav-btn ${activeSection === "products" ? "active" : ""}`}
          onClick={() => setActiveSection("products")}
        >
          <div className="section-nav-icon">💻</div>
          <div className="section-nav-content">
            <div className="section-nav-title">למפתח</div>
            <div className="section-nav-desc">מוצרים ו-API</div>
          </div>
        </button>
      </nav>

      {/* Content Section */}
      <div className="landing-content">{renderSection()}</div>
    </div>
  );
}
