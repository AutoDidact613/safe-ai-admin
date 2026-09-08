import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "../styles/top-navigation.css";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/authStore";
import ThemeToggle from "./ThemeToggle";

export default function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, userRole, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [prevLocationKey, setPrevLocationKey] = useState(location.key);
  const menuRef = useRef<HTMLDivElement>(null);
  const devMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on navigation
  if (location.key !== prevLocationKey) {
    setPrevLocationKey(location.key);
    setShowUserMenu(false);
    setShowDevMenu(false);
  }

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="top-navigation">
      <div className="top-nav-container">
        {/* Logo and Brand */}
        <div className="top-nav-brand">
          <Link to="/" className="brand-link" aria-label="SafeAI 613">
            <svg
              className="brand-logo"
              viewBox="0 0 400 120"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-hidden="true"
              style={{ direction: "ltr" }}
            >
              <defs>
                <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10a37f" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0d8f6f" stopOpacity={1} />
                </linearGradient>
              </defs>
              <text
                x="20"
                y="80"
                fontFamily="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                fontSize="52"
                fontWeight="bold"
                fill="var(--text-primary)"
                style={{ direction: "ltr" }}
              >
                SafeAI
              </text>
              <text
                x="182"
                y="80"
                fontFamily="'Brush Script MT', 'Comic Sans MS', cursive"
                fontSize="52"
                fontStyle="italic"
                fill="url(#brandGradient)"
                style={{ direction: "ltr" }}
              >
                613
              </text>
            </svg>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="top-nav-links">
          {!isAuthenticated ? (
            <>
              {/* Public Navigation */}

              <Link to="/about" className="top-nav-link">
                {t("nav.why")}
              </Link>
              <Link to="/courses" className="top-nav-link">
               {t("nav.courses")}
              </Link>
              <Link to="/forum" className="top-nav-link">
                פורום
              </Link>

              {/* Developers Dropdown */}
              <div className="dev-menu-container" ref={devMenuRef}>
                <button
                  className="top-nav-link dev-menu-trigger"
                  onClick={() => setShowDevMenu(!showDevMenu)}
                >
                  Developers
                  <svg
                    className={`dropdown-arrow ${showDevMenu ? "open" : ""}`}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2.5 4.5L6 8L9.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {showDevMenu && (
                  <div className="dev-menu-dropdown">
                    <Link to="/docs" className="dev-menu-item" onClick={() => setShowDevMenu(false)}>
                      {t("nav.docs")}
                    </Link>
                    <Link to="/docs-old" className="dev-menu-item" onClick={() => setShowDevMenu(false)}>
                      מדריך SafeAI
                    </Link>
                    <Link to="/recommended-guides" className="dev-menu-item" onClick={() => setShowDevMenu(false)}>
                      {t("nav.recommendedGuides")}
                    </Link>
                  </div>
                )}
              </div>

              <Link to="/contact" className="top-nav-link">
                {t("nav.contact")}
              </Link>

              {/* Auth Buttons */}
              <Link to="/login" className="top-nav-btn top-nav-btn-secondary">
                {t("nav.login")}
              </Link>
              <Link to="/register" className="top-nav-btn top-nav-btn-primary">
                {t("nav.register")}
              </Link>
            </>
          ) : (
            <>
              {/* Authenticated Navigation */}
              <Link
                to="/safeai-ui"
                className={`top-nav-link ${location.pathname === "/safeai-ui" ? "active" : ""}`}
              >
               {t("nav.personalArea")}
              </Link>
              <Link
                to="/ai-news"
                className={`top-nav-link ${location.pathname === "/ai-news" ? "active" : ""}`}
              >
                {t("nav.aiNews")}
              </Link>
              <Link to="/courses" className="top-nav-link">
                {t("nav.courses")}
              </Link>
              <Link to="/forum" className="top-nav-link">
                פורום
              </Link>

              {/* Developers Dropdown */}
              <div className="dev-menu-container" ref={devMenuRef}>
                <button
                  className="top-nav-link dev-menu-trigger"
                  onClick={() => setShowDevMenu(!showDevMenu)}
                >
                  Developers
                  <svg
                    className={`dropdown-arrow ${showDevMenu ? "open" : ""}`}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2.5 4.5L6 8L9.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {showDevMenu && (
                  <div className="dev-menu-dropdown">
                    <Link to="/docs" className="dev-menu-item" onClick={() => setShowDevMenu(false)}>
                      {t("nav.docs")}
                    </Link>
                    <Link to="/docs-old" className="dev-menu-item" onClick={() => setShowDevMenu(false)}>
                      מדריך SafeAI
                    </Link>
                    <Link to="/recommended-guides" className="dev-menu-item" onClick={() => setShowDevMenu(false)}>
                      {t("nav.recommendedGuides")}
                    </Link>
                    {userRole === "admin" && (
                      <Link to="/admin/articles" className="dev-menu-item" onClick={() => setShowDevMenu(false)}>
                        ניהול Docs
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <Link to="/contact" className="top-nav-link">
                {t("nav.contact")}
              </Link>
              <Link to="/tender-board" className="top-nav-link">
                {t("nav.tenderBoard")}
              </Link>
              {/* <Link to="/download-agents" className="top-nav-link">
                {t("nav.downloadAgents")}
              </Link> */}

              {/* User Menu */}
              <div className="user-menu-container" ref={menuRef}>
                <button
                  className="user-menu-trigger"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="user-avatar">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className="user-name">{user?.name ||t("nav.defaultUserName")}</span>
                  <svg
                    className={`dropdown-arrow ${showUserMenu ? "open" : ""}`}
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                  >
                    <path
                      d="M2.5 4.5L6 8L9.5 4.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="user-menu-dropdown">
                    <div className="user-menu-header">
                      <div className="user-menu-name">{user?.name}</div>
                      <div className="user-menu-email">{user?.email}</div>
                    </div>
                    <div className="user-menu-divider"></div>
                    <Link
                      to="/safeai-ui"
                      className="user-menu-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M2 8h12M8 2v12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      {t("nav.personalArea")}
                    </Link>
                    <Link
                      to="/api-key-display"
                      className="user-menu-item"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 2v12M2 8h12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      {t("nav.apiKeys")}
                    </Link>
                    <div className="user-menu-divider"></div>
                    <button className="user-menu-item" onClick={handleLogout}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          <ThemeToggle />
        </div>
        <LanguageSwitcher />
      </div>
    </nav>
  );
}