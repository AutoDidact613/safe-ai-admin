import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/safeai-ui.css";
import ProfilesManagement from "../features/safeai-ui/ProfilesManagement";
import UsersManagement from "../features/safeai-ui/UsersManagement";
import UserDashboard from "../features/safeai-ui/UserDashboard";
import Statistics from "../features/safeai-ui/Statistics";
import UserApiKeysPage from "../features/safeai-ui/UserApiKeysPage";
import { OrganizationsManagement } from "../features/organizations/OrganizationsManagement";
import { PendingApprovalScreen } from "../features/organizations/PendingApprovalScreen";
import { getMyOrganization } from "../features/organizations/api/organizationApi";
import OrganizationUsersPage from "../pages/OrganizationUsersPage";

type Section =
  | "profiles"
  | "users"
  | "dashboard"
  | "statistics"
  | "apikeys"
  | "organizations"
  | "org-statistics"
  | "org-users";

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
      const defaultSection: Section = storedRole === "org_owner" ? "org-statistics" : "statistics";
      return {
        user: parsedUser,
        role: storedRole as "admin" | "user" | "org_owner",
        section: defaultSection,
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
  const [userRole] = useState<"admin" | "user" | "org_owner" | null>(
    initialState.role,
  );
  const [currentUser] = useState<UserData | null>(
    initialState.user,
  );

  // Gate for org owners: block management until their org is approved
  const [orgGate, setOrgGate] = useState<{ loading: boolean; pending: boolean; orgName?: string }>({
    loading: initialState.role === "org_owner",
    pending: false,
  });

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!userRole) {
      navigate("/");
    }
  }, [userRole, navigate]);

  // For org owners, check their organization's approval status
  useEffect(() => {
    if (userRole !== "org_owner") return;
    let active = true;
    getMyOrganization()
      .then((res) => {
        if (!active) return;
        const org = res.organization;
        setOrgGate({
          loading: false,
          pending: !!org && org.status !== "approved",
          orgName: org?.name,
        });
      })
      .catch(() => {
        if (active) setOrgGate({ loading: false, pending: false });
      });
    return () => {
      active = false;
    };
  }, [userRole]);

  const renderSection = () => {
    // Org owners whose org is not yet approved only see the pending screen
    if (userRole === "org_owner") {
      if (orgGate.loading) return <div className="orgs-loading">טוען...</div>;
      if (orgGate.pending) return <PendingApprovalScreen orgName={orgGate.orgName} />;
    }
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
        return <OrganizationsManagement />;
      case "org-statistics":
        return <Statistics user={currentUser} />;
        case "org-users":
          return <OrganizationUsersPage />;
      default:
        return <UserDashboard user={currentUser} />;
    }
  };

  return (
    <div className="safeai-ui-page">
      {userRole && (
        <nav className="dashboard-sub-nav">
          <div className="sub-nav-container">
  
            {/* מנהל ראשי */}
            {userRole === "admin" && (
              <>
                <button
                  className={activeSection === "statistics" ? "sub-nav-btn active" : "sub-nav-btn"}
                  onClick={() => setActiveSection("statistics")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 14V8M8 14V2M14 14V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  סטטיסטיקות
                </button>
                <button
                  className={activeSection === "profiles" ? "sub-nav-btn active" : "sub-nav-btn"}
                  onClick={() => setActiveSection("profiles")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-2.21 2.686-4 6-4s6 1.79 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  ניהול פרופילים
                </button>
                <button
                  className={activeSection === "users" ? "sub-nav-btn active" : "sub-nav-btn"}
                  onClick={() => setActiveSection("users")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M11 7a2 2 0 100-4 2 2 0 000 4zM13 13c0-1.657-1.343-3-3-3M5 7a2 2 0 100-4 2 2 0 000 4zM1 13c0-1.657 1.343-3 3-3s3 1.343 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  ניהול משתמשים
                </button>
                <button
                  className={activeSection === "organizations" ? "sub-nav-btn active" : "sub-nav-btn"}
                  onClick={() => setActiveSection("organizations")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 3h10v10H3V3zm2 2v6m4-6v6m-4-3h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  ניהול ארגונים
                </button>
              </>
            )}
  
            {/* משתמש רגיל */}
            {userRole === "user" && (
              <>
                <button
                  className={activeSection === "statistics" ? "sub-nav-btn active" : "sub-nav-btn"}
                  onClick={() => setActiveSection("statistics")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 14V8M8 14V2M14 14V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  סטטיסטיקות
                </button>
                <button
                  className={activeSection === "apikeys" ? "sub-nav-btn active" : "sub-nav-btn"}
                  onClick={() => setActiveSection("apikeys")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M6 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 8V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M12 8V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  מפתחות API
                </button>
              </>
            )}

            {/* מנהל ארגון */}
            {userRole === "org_owner" && (
              <>
                <button
                  className={activeSection === "org-statistics" ? "sub-nav-btn active" : "sub-nav-btn"}
                  onClick={() => setActiveSection("org-statistics")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 14V8M8 14V2M14 14V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  סטטיסטיקות של הארגון
                </button>
                <button
                  className={activeSection === "org-users" ? "sub-nav-btn active" : "sub-nav-btn"}
                  onClick={() => setActiveSection("org-users")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M11 7a2 2 0 100-4 2 2 0 000 4zM13 13c0-1.657-1.343-3-3-3M5 7a2 2 0 100-4 2 2 0 000 4zM1 13c0-1.657 1.343-3 3-3s3 1.343 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  ניהול משתמשים
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
