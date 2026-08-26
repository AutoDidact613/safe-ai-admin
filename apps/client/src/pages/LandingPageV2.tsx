import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/landing-page-v2.css";
import { useAuth } from "../context/authStore";
import InfoModal from "../features/landing/InfoModal";

type BannerStatus = "available" | "soon";

interface Banner {
  key: string;
  icon: string;
  title: string;
  description: string;
  status: BannerStatus;
  onClick: () => void;
}

interface ModalContent {
  icon: string;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
}

interface StatItem {
  label: string;
  value: string;
}

// TODO: לחבר ל-endpoint ציבורי אמיתי בשרת כשזה יהיה קיים (ראו backend requirement).
const STATS: StatItem[] = [
  { label: "משתמשים רשומים", value: "בקרוב" },
  { label: "ארגונים פעילים", value: "בקרוב" },
  { label: "פרויקטים תחת SafeAI", value: "בקרוב" },
];

export default function LandingPageV2() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [modal, setModal] = useState<ModalContent | null>(null);

  const showComingSoon = (name: string) => {
    setModal({
      icon: "🚧",
      title: "בקרוב",
      message: `${name} עדיין בבנייה ויהיה זמין בקרוב במערכת.`,
    });
  };

  const handleForumClick = () => {
    if (isAuthenticated) {
      navigate("/forum");
      return;
    }
    setModal({
      icon: "🔒",
      title: "נדרשת התחברות",
      message: "כדי להיכנס לפורום זהירות AI יש להתחבר קודם למערכת.",
      primaryLabel: "מעבר להתחברות",
      onPrimaryAction: () => navigate("/login"),
    });
  };

  const banners: Banner[] = [
    {
      key: "platform",
      icon: "🛡️",
      title: "SafeAI Platform",
      description: "איזור אישי, תיעוד, יצירת קשר וניהול ארגונים",
      status: "soon",
      onClick: () => showComingSoon("SafeAI Platform"),
    },
    {
      key: "hub",
      icon: "🎓",
      title: "SafeAI Hub",
      description: "קורסים, חדשות, לוח פרויקטים, פורום ומדריכים",
      status: "soon",
      onClick: () => showComingSoon("SafeAI Hub"),
    },
    {
      key: "forum",
      icon: "💬",
      title: "פורום זהירות AI",
      description: "דיון קהילתי בנושאי בטיחות ואחריות בשימוש בבינה מלאכותית",
      status: "available",
      onClick: handleForumClick,
    },
    {
      key: "safechatbox",
      icon: "📦",
      title: "SafeChatbox",
      description: "פתרון תקשורת מאובטח מבוסס AI",
      status: "soon",
      onClick: () => showComingSoon("SafeChatbox"),
    },
  ];

  return (
    <div className="landing-v2">
      <section className="lv2-hero">
        <span className="lv2-badge">SafeAI 613</span>
        <h1 className="lv2-title">שימוש בטוח ואחראי בבינה מלאכותית</h1>
        <p className="lv2-subtitle">
          מערכת אחת לניהול, בקרה ולמידה סביב שימוש בכלי AI — למפתחים, לארגונים ולכל משתמש.
        </p>
        <div className="lv2-hero-actions">
          <button className="lv2-btn lv2-btn-primary" onClick={() => navigate("/login")}>
            כניסה לפלטפורמה
          </button>
          <button className="lv2-btn lv2-btn-primary-alt" onClick={() => navigate("/login")}>
            כניסה ל-Hub
          </button>
          <button className="lv2-btn lv2-btn-ghost" onClick={() => navigate("/register")}>
            הרשמה חדשה
          </button>
        </div>
      </section>

      <section className="lv2-banners">
        {banners.map((banner) => (
          <button
            key={banner.key}
            className={`lv2-banner-card lv2-status-${banner.status}`}
            onClick={banner.onClick}
          >
            {banner.status === "soon" && <span className="lv2-soon-tag">בקרוב</span>}
            <div className="lv2-banner-icon">{banner.icon}</div>
            <h3 className="lv2-banner-title">{banner.title}</h3>
            <p className="lv2-banner-desc">{banner.description}</p>
          </button>
        ))}
      </section>

      <section className="lv2-stats">
        {STATS.map((stat) => (
          <div key={stat.label} className="lv2-stat-item">
            <div className="lv2-stat-value">{stat.value}</div>
            <div className="lv2-stat-label">{stat.label}</div>
          </div>
        ))}
      </section>

      <button
        className="lv2-chat-fab"
        onClick={() => showComingSoon("הצ'אט")}
        aria-label="פתיחת צ'אט"
      >
        💬
      </button>

      {modal && (
        <InfoModal
          icon={modal.icon}
          title={modal.title}
          message={modal.message}
          primaryLabel={modal.primaryLabel}
          onPrimaryAction={modal.onPrimaryAction}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
