import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OrganizationsList } from "./components/OrganizationsList";
import { OrganizationDetail } from "./components/OrganizationDetail";
import { PendingOrganizationsPage } from "./pages/PendingOrganizationsPage";
import "../../styles/organizations-admin.css";

type Tab = "all" | "pending";

export const OrganizationsManagement = () => {
  const [tab, setTab] = useState<Tab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { t } = useTranslation();

  if (selectedId) {
    return (
      <div className="orgs-admin-container">
        <OrganizationDetail orgId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div className="orgs-admin-container">
      <h1 className="orgs-admin-title">{t("safeaiNav.manageOrganizations")}</h1>

      <div className="orgs-subtoggle">
        <button
          className={tab === "all" ? "orgs-subtoggle-btn active" : "orgs-subtoggle-btn"}
          onClick={() => setTab("all")}
        >
          {t("organizations.manageOrgsAllTab")}
        </button>
        <button
          className={tab === "pending" ? "orgs-subtoggle-btn active" : "orgs-subtoggle-btn"}
          onClick={() => setTab("pending")}
        >
          {t("organizations.manageOrgsPendingTab")}
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