import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/landing-page-v2.css";
import { useAuth } from "../context/authStore";
import { API_ENDPOINTS, apiCall } from "../config/api";
import InfoModal from "../features/landing/InfoModal";
import CountUpStat from "../features/landing/CountUpStat";
import {
  ShieldIcon,
  BookIcon,
  ChatIcon,
  BoxIcon,
  ClockIcon,
  LockIcon,
  ChevronDownIcon,
  ArrowUpIcon,
} from "../features/landing/icons";

type BannerStatus = "available" | "soon";

interface Banner {
  key: string;
  icon: ReactNode;
  title: string;
  description: string;
  status: BannerStatus;
  onClick: () => void;
}

interface ModalContent {
  icon: ReactNode;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
}

interface PublicStats {
  userCount: number;
  organizationCount: number;
  tenderCount: number;
}

const HERO_PROMPTS = [
  "איך בודקים שמודל AI לא חושף מידע רגיש?",
  "מה ההבדל בין SafeAI Platform ל-SafeAI Hub?",
  "איך פותחים ארגון חדש במערכת?",
];

export default function LandingPageV2() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [modal, setModal] = useState<ModalContent | null>(null);
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);
  const [loginMenuOpen, setLoginMenuOpen] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsFailed, setStatsFailed] = useState(false);
  const productsMenuRef = useRef<HTMLDivElement>(null);
  const loginMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIndex((current) => (current + 1) % HERO_PROMPTS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiCall<PublicStats>(API_ENDPOINTS.publicStats)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStatsFailed(true);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productsMenuRef.current && !productsMenuRef.current.contains(event.target as Node)) {
        setProductsMenuOpen(false);
      }
      if (loginMenuRef.current && !loginMenuRef.current.contains(event.target as Node)) {
        setLoginMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showComingSoon = (name: string) => {
    setModal({
      icon: <ClockIcon />,
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
      icon: <LockIcon />,
      title: "נדרשת התחברות",
      message: "כדי להיכנס לפורום זהירות AI יש להתחבר קודם למערכת.",
      primaryLabel: "מעבר להתחברות",
      onPrimaryAction: () => navigate("/login"),
    });
  };

  const handleHeroSubmit = (event: FormEvent) => {
    event.preventDefault();
    showComingSoon("העוזר החכם של SafeAI");
  };

  const banners: Banner[] = [
    {
      key: "platform",
      icon: <ShieldIcon />,
      title: "SafeAI Platform",
      description: "איזור אישי, תיעוד, יצירת קשר וניהול ארגונים",
      status: "soon",
      onClick: () => showComingSoon("SafeAI Platform"),
    },
    {
      key: "hub",
      icon: <BookIcon />,
      title: "SafeAI Hub",
      description: "קורסים, חדשות, לוח פרויקטים, פורום ומדריכים",
      status: "soon",
      onClick: () => showComingSoon("SafeAI Hub"),
    },
    {
      key: "forum",
      icon: <ChatIcon />,
      title: "פורום זהירות AI",
      description: "דיון קהילתי בנושאי בטיחות ואחריות בשימוש בבינה מלאכותית",
      status: "available",
      onClick: handleForumClick,
    },
    {
      key: "safechatbox",
      icon: <BoxIcon />,
      title: "SafeChatbox",
      description: "פתרון תקשורת מאובטח מבוסס AI",
      status: "soon",
      onClick: () => showComingSoon("SafeChatbox"),
    },
  ];

  return (
    <div className="landing-v2">
      {/* טיוטת ניווט להמחשה בלבד — TopNavigation הגלובלי הקיים ממשיך להופיע מעליה */}
      <div className="lv2-preview-tag">טיוטת עיצוב — להמחשה בלבד</div>

      <header className="lv2-header">
        <Link to="/" className="lv2-logo">
          SafeAI<span>613</span>
        </Link>

        <nav className="lv2-header-nav">
          <div className="lv2-menu" ref={productsMenuRef}>
            <button
              className="lv2-header-link"
              onClick={() => setProductsMenuOpen((open) => !open)}
            >
              המוצרים שלנו
              <ChevronDownIcon className={`lv2-caret ${productsMenuOpen ? "open" : ""}`} />
            </button>
            {productsMenuOpen && (
              <div className="lv2-dropdown lv2-dropdown-products">
                <div className="lv2-dropdown-col">
                  <span className="lv2-dropdown-heading">מוצרים</span>
                  <button onClick={() => { setProductsMenuOpen(false); showComingSoon("SafeAI Platform"); }}>SafeAI Platform</button>
                  <button onClick={() => { setProductsMenuOpen(false); showComingSoon("SafeAI Hub"); }}>SafeAI Hub</button>
                  <button onClick={() => { setProductsMenuOpen(false); showComingSoon("SafeChatbox"); }}>SafeChatbox</button>
                </div>
                <div className="lv2-dropdown-col">
                  <span className="lv2-dropdown-heading">משאבים</span>
                  <Link to="/docs" onClick={() => setProductsMenuOpen(false)}>תיעוד</Link>
                  <Link to="/courses" onClick={() => setProductsMenuOpen(false)}>קורסים</Link>
                  <Link to="/recommended-guides" onClick={() => setProductsMenuOpen(false)}>מדריכים מומלצים</Link>
                </div>
              </div>
            )}
          </div>

          <button className="lv2-header-link" onClick={handleForumClick}>
            פורום
          </button>
          <Link to="/about" className="lv2-header-link">למה?</Link>
          <Link to="/contact" className="lv2-header-link">צור קשר</Link>
        </nav>

        <div className="lv2-header-actions">
          <div className="lv2-menu" ref={loginMenuRef}>
            <button className="lv2-btn lv2-btn-ghost lv2-btn-sm" onClick={() => setLoginMenuOpen((open) => !open)}>
              התחברות
              <ChevronDownIcon className={`lv2-caret ${loginMenuOpen ? "open" : ""}`} />
            </button>
            {loginMenuOpen && (
              <div className="lv2-dropdown lv2-dropdown-login">
                <button onClick={() => navigate("/login")}>כניסה לפלטפורמה</button>
                <button onClick={() => navigate("/login")}>כניסה ל-Hub</button>
              </div>
            )}
          </div>
          <button className="lv2-btn lv2-btn-primary lv2-btn-sm" onClick={() => navigate("/register")}>
            הרשמה
          </button>
        </div>
      </header>

      <section className="lv2-hero">
        <span className="lv2-badge">SafeAI 613</span>
        <h1 className="lv2-title">שימוש בטוח ואחראי בבינה מלאכותית</h1>

        <form className="lv2-hero-search" onSubmit={handleHeroSubmit}>
          <input
            type="text"
            className="lv2-hero-search-input"
            placeholder={HERO_PROMPTS[promptIndex]}
            aria-label="שאלו את SafeAI"
          />
          <button type="submit" className="lv2-hero-search-submit" aria-label="שליחה">
            <ArrowUpIcon />
          </button>
        </form>

        <div className="lv2-hero-chips">
          <button className="lv2-chip" onClick={() => navigate("/login")}>כניסה לפלטפורמה</button>
          <button className="lv2-chip" onClick={handleForumClick}>פורום זהירות AI</button>
          <button className="lv2-chip" onClick={() => navigate("/register")}>הרשמה חדשה</button>
          <button className="lv2-chip" onClick={() => showComingSoon("SafeAI Hub")}>SafeAI Hub</button>
        </div>
      </section>

      <section className="lv2-banners">
        {banners.map((banner) => (
          <button
            key={banner.key}
            className={`lv2-banner-card lv2-status-${banner.status}`}
            onClick={banner.onClick}
          >
            <span className={banner.status === "soon" ? "lv2-soon-tag" : "lv2-available-tag"}>
              {banner.status === "soon" ? "בקרוב" : "זמין"}
            </span>
            <div className="lv2-banner-icon">{banner.icon}</div>
            <h3 className="lv2-banner-title">{banner.title}</h3>
            <p className="lv2-banner-desc">{banner.description}</p>
          </button>
        ))}
      </section>

      <section className="lv2-stats">
        <CountUpStat
          label="משתמשים רשומים"
          value={stats?.userCount ?? null}
          loading={statsLoading}
          failed={statsFailed}
        />
        <CountUpStat
          label="ארגונים פעילים"
          value={stats?.organizationCount ?? null}
          loading={statsLoading}
          failed={statsFailed}
        />
        <CountUpStat
          label="פרויקטים תחת SafeAI"
          value={stats?.tenderCount ?? null}
          loading={statsLoading}
          failed={statsFailed}
        />
      </section>

      <footer className="lv2-footer">
        <div className="lv2-footer-col">
          <span className="lv2-footer-heading">מוצרים</span>
          <button onClick={() => showComingSoon("SafeAI Platform")}>SafeAI Platform</button>
          <button onClick={() => showComingSoon("SafeAI Hub")}>SafeAI Hub</button>
          <button onClick={() => showComingSoon("SafeChatbox")}>SafeChatbox</button>
          <button onClick={handleForumClick}>פורום זהירות AI</button>
        </div>
        <div className="lv2-footer-col">
          <span className="lv2-footer-heading">משאבים</span>
          <Link to="/docs">תיעוד</Link>
          <Link to="/courses">קורסים</Link>
          <Link to="/recommended-guides">מדריכים מומלצים</Link>
        </div>
        <div className="lv2-footer-col">
          <span className="lv2-footer-heading">החברה</span>
          <Link to="/about">אודות</Link>
          <Link to="/contact">צור קשר</Link>
          <Link to="/privacy">מדיניות פרטיות</Link>
        </div>
        <div className="lv2-footer-col">
          <span className="lv2-footer-heading">חשבון</span>
          <Link to="/login">התחברות</Link>
          <Link to="/register">הרשמה</Link>
        </div>
      </footer>

      <button
        className="lv2-chat-fab"
        onClick={() => showComingSoon("הצ'אט")}
        aria-label="פתיחת צ'אט"
      >
        <ChatIcon size={22} />
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
