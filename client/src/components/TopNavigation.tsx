import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import "../styles/top-navigation.css";
import { useAuth } from "../context/AuthContext";

export default function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const devMenuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (devMenuRef.current && !devMenuRef.current.contains(event.target as Node)) {
        setShowDevMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on navigation
  useEffect(() => {
    setShowUserMenu(false);
    setShowDevMenu(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

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
                למה?
              </Link>
              <Link to="/courses" className="top-nav-link">
                קורסים
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
                      Docs
                    </Link>
                    <Link to="/docs-old" className="dev-menu-item" onClick={() => setShowDevMenu(false)}>
                      מדריך SafeAI
                    </Link>
                    <Link to="/recommended-guides" className="dev-menu-item" onClick={() => setShowDevMenu(false)}>
                      מדריכים מומלצים
                    </Link>
                  </div>
                )}
              </div>

              <Link to="/contact" className="top-nav-link">
                צור קשר
              </Link>

              {/* Auth Buttons */}
              <Link to="/login" className="top-nav-btn top-nav-btn-secondary">
                התחברות
              </Link>
              <Link to="/register" className="top-nav-btn top-nav-btn-primary">
                הרשמה
              </Link>
            </>
          ) : (
            <>
              {/* Authenticated Navigation */}
              <Link
                to="/safeai-ui"
                className={`top-nav-link ${location.pathname === "/safeai-ui" ? "active" : ""}`}
              >
                איזור אישי
              </Link>
              <Link to="/courses" className="top-nav-link">
                קורסים
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
                      Docs
                    </Link>
                    <Link to="/docs-old" className="dev-menu-item" onClick={() => setShowDevMenu(false)}>
                      מדריך SafeAI
                    </Link>
                    <Link to="/recommended-guides" className="dev-menu-item" onClick={() => setShowDevMenu(false)}>
                      מדריכים מומלצים
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
                צור קשר
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
                  <span className="user-name">{user?.name || "משתמש"}</span>
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
                      איזור אישי
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
                      API Keys
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
                      יציאה
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}