import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/safeai-ui.css";
import ProfilesManagement from "../features/safeai-ui/ProfilesManagement";
import UsersManagement from "../features/safeai-ui/UsersManagement";
import UserDashboard from "../features/safeai-ui/UserDashboard";
import Statistics from "../features/safeai-ui/Statistics";
import UserApiKeysPage from "../features/safeai-ui/UserApiKeysPage";
import AdminOrganizationsPage from "./AdminOrganizationsPage";

type Section =
  | "profiles"
  | "users"
  | "dashboard"
  | "statistics"
  | "apikeys"
  | "organizations";

interface UserData {
  email: string;
  name: string;
  _id?: string;
}

export default function SafeAIUIPage() {
  const navigate = useNavigate();

  // Initialize state from localStorage
  const getInitialState = () => {
    const storedUser = localStorage.getItem("user");
    const storedRole = localStorage.getItem("userRole");

    if (storedUser && storedRole) {
      const parsedUser = JSON.parse(storedUser);
      return {
        user: parsedUser,
        role: storedRole as "admin" | "user",
        section: "statistics" as Section,
      };
    }

    return {
      user: null,
      role: null,
      section: "dashboard" as Section,
    };
  };

  const initialState = getInitialState();
  const [activeSection, setActiveSection] = useState<Section>(
    initialState.section,
  );
  const [userRole] = useState<"admin" | "user" | null>(
    initialState.role,
  );
  const [currentUser] = useState<UserData | null>(
    initialState.user,
  );

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!userRole) {
      navigate("/");
    }
  }, [userRole, navigate]);

  const renderSection = () => {
    switch (activeSection) {
      case "profiles":
        return <ProfilesManagement />;
      case "users":
        return <UsersManagement />;
      case "dashboard":
        return <UserDashboard user={currentUser} />;
      case "statistics":
        return <Statistics user={currentUser} />;
      case "apikeys":
        return <UserApiKeysPage />;
      case "organizations":
        return <AdminOrganizationsPage />;
      default:
        return <UserDashboard user={currentUser} />;
    }
  };

  return (
    <div className="safeai-ui-page">
      {userRole && (
        <nav className="dashboard-sub-nav">
          <div className="sub-nav-container">
            {userRole === "admin" && (
              <>
                <button
                  className={
                    activeSection === "statistics"
                      ? "sub-nav-btn active"
                      : "sub-nav-btn"
                  }
                  onClick={() => setActiveSection("statistics")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 14V8M8 14V2M14 14V6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  סטטיסטיקות
                </button>
                <button
                  className={
                    activeSection === "profiles"
                      ? "sub-nav-btn active"
                      : "sub-nav-btn"
                  }
                  onClick={() => setActiveSection("profiles")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-2.21 2.686-4 6-4s6 1.79 6 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  ניהול פרופילים
                </button>
                <button
                  className={
                    activeSection === "users"
                      ? "sub-nav-btn active"
                      : "sub-nav-btn"
                  }
                  onClick={() => setActiveSection("users")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M11 7a2 2 0 100-4 2 2 0 000 4zM13 13c0-1.657-1.343-3-3-3M5 7a2 2 0 100-4 2 2 0 000 4zM1 13c0-1.657 1.343-3 3-3s3 1.343 3 3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  ניהול משתמשים
                </button>
                <button
                  className={
                    activeSection === "organizations"
                      ? "sub-nav-btn active"
                      : "sub-nav-btn"
                  }
                  onClick={() => setActiveSection("organizations")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 3h10v10H3V3zm2 2v6m4-6v6m-4-3h6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  ניהול ארגונים
                </button>
              </>
            )}
            {userRole === "user" && (
              <>
                <button
                  className={
                    activeSection === "statistics"
                      ? "sub-nav-btn active"
                      : "sub-nav-btn"
                  }
                  onClick={() => setActiveSection("statistics")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 14V8M8 14V2M14 14V6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  סטטיסטיקות
                </button>
                <button
                  className={
                    activeSection === "apikeys"
                      ? "sub-nav-btn active"
                      : "sub-nav-btn"
                  }
                  onClick={() => setActiveSection("apikeys")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="4"
                      cy="8"
                      r="2"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />

                    <path
                      d="M6 8H13"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />

                    <path
                      d="M10 8V10"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M12 8V10"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                  מפתחות API
                </button>
              </>
            )}
          </div>
        </nav>
      )}

      <div className="safeai-content">{renderSection()}</div>
    </div>
  );
}
