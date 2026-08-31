import { useNavigate } from "react-router-dom";
import "../styles/landing-page-v2.css";
import "../styles/sub-home-pages.css";
import { ChatIcon, BookIcon, CompassIcon, ClipboardIcon, NewsIcon } from "../features/landing/icons";
import type { ReactNode } from "react";

interface HubLink {
  key: string;
  icon: ReactNode;
  title: string;
  description: string;
  path: string;
}

// Links per SCRUM-228's acceptance criteria: פורום, קורסים, מדריכים מומלצים, מכרזים, חדשות AI.
const HUB_LINKS: HubLink[] = [
  {
    key: "forum",
    icon: <ChatIcon />,
    title: "פורום זהירות AI",
    description: "שאלות, דיונים ושיתוף ידע עם קהילת המתכנתים.",
    path: "/forum",
  },
  {
    key: "courses",
    icon: <BookIcon />,
    title: "קורסים",
    description: "קורסים מקצועיים להעמקת הידע בפיתוח בטוח עם AI.",
    path: "/courses",
  },
  {
    key: "guides",
    icon: <CompassIcon />,
    title: "מדריכים מומלצים",
    description: "אוסף מדריכים נבחרים לעבודה יומיומית עם המערכת.",
    path: "/recommended-guides",
  },
  {
    key: "tenders",
    icon: <ClipboardIcon />,
    title: "לוח פרויקטים",
    description: "מכרזים ופרויקטים פתוחים לשיתוף פעולה.",
    path: "/tender-board",
  },
  {
    key: "news",
    icon: <NewsIcon />,
    title: "חדשות AI",
    description: "עדכונים שוטפים מעולם הבינה המלאכותית.",
    path: "/ai-news",
  },
];

export default function SafeAIHubHomePage() {
  const navigate = useNavigate();

  return (
    <div className="landing-v2 subhome-page">
      <header className="subhome-header">
        <span className="subhome-eyebrow">SafeAI Hub</span>
        <h1 className="subhome-title">דף הבית למתכנתים</h1>
        <p className="subhome-desc">
          כל המשאבים למתכנתים במקום אחד — פורום, קורסים, מדריכים, פרויקטים וחדשות.
        </p>
      </header>

      <div className="subhome-links">
        {HUB_LINKS.map((link) => (
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
