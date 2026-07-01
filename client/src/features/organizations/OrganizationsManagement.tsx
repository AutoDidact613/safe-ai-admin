import { useState } from "react";
import { OrganizationsList } from "./components/OrganizationsList";
import { OrganizationDetail } from "./components/OrganizationDetail";
import { PendingOrganizationsPage } from "./pages/PendingOrganizationsPage";
import "../../styles/organizations-admin.css";

type Tab = "all" | "pending";

export const OrganizationsManagement = () => {
  const [tab, setTab] = useState<Tab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return (
      <div className="orgs-admin-container">
        <OrganizationDetail orgId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div className="orgs-admin-container">
      <h1 className="orgs-admin-title">ניהול ארגונים</h1>

      <div className="orgs-subtoggle">
        <button
          className={tab === "all" ? "orgs-subtoggle-btn active" : "orgs-subtoggle-btn"}
          onClick={() => setTab("all")}
        >
          כל הארגונים
        </button>
        <button
          className={tab === "pending" ? "orgs-subtoggle-btn active" : "orgs-subtoggle-btn"}
          onClick={() => setTab("pending")}
        >
          ממתינים לאישור
        </button>
      </div>

      {tab === "all" ? (
        <OrganizationsList onOpenOrg={setSelectedId} />
      ) : (
        <PendingOrganizationsPage />
      )}
    </div>
  );
};