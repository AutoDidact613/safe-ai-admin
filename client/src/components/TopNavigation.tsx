import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "../styles/top-navigation.css";
import { cleanupTokenManager } from "../utils/tokenManager";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

export default function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(
    null,
  );
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check authentication status
    const accessToken = localStorage.getItem("accessToken");
    const userStr = localStorage.getItem("user");

    const checkAuth = () => {
      if (accessToken && userStr) {
        setIsAuthenticated(true);
        try {
          setUser(JSON.parse(userStr));
        } catch (e) {
          console.error("Error parsing user data:", e);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    checkAuth();
  }, [location]);

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
    // Cleanup token manager
    cleanupTokenManager();

    // Clear local storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");

    setShowUserMenu(false);
    navigate("/");
  };

  // const scrollToSection = (sectionId: string) => {
  //   if (location.pathname !== "/") {
  //     navigate("/");
  //     setTimeout(() => {
  //       const element = document.getElementById(sectionId);
  //       if (element) {
  //         element.scrollIntoView({ behavior: "smooth" });
  //       }
  //     }, 100);
  //   } else {
  //     const element = document.getElementById(sectionId);
  //     if (element) {
  //       element.scrollIntoView({ behavior: "smooth" });
  //     }
  //   }
  // };

  return (
    <nav className="top-navigation">
      <div className="top-nav-container">
        {/* Logo and Brand */}
        <div className="top-nav-brand">
          <Link to="/" className="brand-link">
            <img src="/logo.svg" alt="SafeAI 613" className="brand-logo" />
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
              <Link to="/docs" className="top-nav-link">
                {t("nav.docs")}
              </Link>
              <Link to="/recommended-guides" className="top-nav-link">
                {t("nav.recommendedGuides")}
              </Link>
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
              <Link to="/courses" className="top-nav-link">
                {t("nav.courses")}
              </Link>
              <Link to="/docs" className="top-nav-link">
                {t("nav.docs")}
              </Link>
              <Link to="/recommended-guides" className="top-nav-link">
                {t("nav.recommendedGuides")}
              </Link>
              <Link to="/contact" className="top-nav-link">
                {t("nav.contact")}
              </Link>

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
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
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
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
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
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
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
        </div>
        <LanguageSwitcher />
      </div>
    </nav>
  );
}
