import React from "react";
import { useTranslation } from "react-i18next";
import type { AdminOrganization } from "../api/organizationApi";

interface OrganizationsTableProps {
  organizations: AdminOrganization[];
  onOpen: (id: string) => void;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  busyId: string | null;
}

export const OrganizationsTable: React.FC<OrganizationsTableProps> = ({
  organizations,
  onOpen,
  onSuspend,
  onActivate,
  busyId,
}) => {
  const { t } = useTranslation();

  function translateStatus(status: string): string {
    switch (status) {
      case "approved": return t("organizations.statusApproved");
      case "pending": return t("pendingOrganizations.pendingStatus");
      case "rejected": return t("organizations.statusRejected");
      default: return status || t("organizations.statusUndefined");
    }
  }

  if (organizations.length === 0) {
    return <div className="orgs-empty">{t("organizations.noOrgsFoundSearch")}</div>;
  }

  return (
    <table className="orgs-table">
      <thead>
        <tr>
          <th>{t("pendingOrganizations.tableHeaderOrgName")}</th>
          <th>{t("orgUsers.roleOrgOwner")}</th>
          <th>{t("pendingOrganizations.tableHeaderStatus")}</th>
          <th>{t("organizations.activityColumn")}</th>
          <th>{t("organizations.usersLabel")}</th>
          <th>{t("organizations.walletBalanceLabel")}</th>
          <th>{t("pendingOrganizations.tableHeaderActions")}</th>
        </tr>
      </thead>
      <tbody>
        {organizations.map((org) => (
          <tr key={org._id}>
            <td className="orgs-name-cell" onClick={() => onOpen(org._id)}>{org.name}</td>
            <td>{org.ownerId?.email || "-"}</td>
            <td>
              <span className={`status-badge ${org.status}`}>{translateStatus(org.status)}</span>
            </td>
            <td>
              <span className={`status-badge ${org.isActive ? "active" : "inactive"}`}>
                {org.isActive ? t("orgUsers.active") : t("organizations.statusSuspended")}
              </span>
            </td>
            <td>{org.userCount}</td>
            <td>${(org.walletBalance ?? 0).toFixed(2)}</td>
            <td>
              {org.isActive ? (
                <button
                  className="orgs-btn orgs-btn-suspend"
                  disabled={busyId === org._id}
                  onClick={() => onSuspend(org._id)}
                >
                  {t("organizations.suspendBtn")}
                </button>
              ) : (
                <button
                  className="orgs-btn orgs-btn-activate"
                  disabled={busyId === org._id}
                  onClick={() => onActivate(org._id)}
                >
                  {t("organizations.activateBtn")}
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
