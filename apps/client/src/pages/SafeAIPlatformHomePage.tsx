import { useNavigate } from "react-router-dom";
import "../styles/landing-page-v2.css";
import "../styles/sub-home-pages.css";
import { DocIcon, MailIcon, UserIcon } from "../features/landing/icons";
import type { ReactNode } from "react";

interface PlatformLink {
  key: string;
  icon: ReactNode;
  title: string;
  description: string;
  path: string;
}

// Links per SCRUM-229's acceptance criteria: docs, צור קשר, אזור אישי.
const PLATFORM_LINKS: PlatformLink[] = [
  {
    key: "docs",
    icon: <DocIcon />,
    title: "תיעוד",
    description: "מדריך שימוש מלא ל-SafeAI API Platform.",
    path: "/docs",
  },
  {
    key: "contact",
    icon: <MailIcon />,
    title: "צור קשר",
    description: "שאלה, בקשה או תקלה? נשמח לעזור.",
    path: "/contact",
  },
  {
    key: "personal-area",
    icon: <UserIcon />,
    title: "אזור אישי",
    description: "ניהול הפרופיל, מפתחות ה-API, החיוב והבקשות שלך.",
    path: "/safeai-ui",
  },
];

export default function SafeAIPlatformHomePage() {
  const navigate = useNavigate();

  return (
    <div className="landing-v2 subhome-page">
      <header className="subhome-header">
        <span className="subhome-eyebrow">SafeAI Platform</span>
        <h1 className="subhome-title">דף הבית שלך</h1>
        <p className="subhome-desc">
          כל מה שצריך לניהול השימוש שלך ב-SafeAI API Platform במקום אחד.
        </p>
      </header>

      <div className="subhome-links">
        {PLATFORM_LINKS.map((link) => (
          <button
            key={link.key}
            className="lv2-banner-card lv2-status-available"
            onClick={() => navigate(link.path)}
          >
            <div className="lv2-banner-icon">{link.icon}</div>
            <div className="lv2-banner-content">
              <div className="lv2-banner-heading">
                <h3 className="lv2-banner-title">{link.title}</h3>
                <span className="lv2-available-tag">זמין</span>
              </div>
              <p className="lv2-banner-desc">{link.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
