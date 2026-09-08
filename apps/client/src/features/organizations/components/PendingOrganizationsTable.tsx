import React from "react";
import { useTranslation } from "react-i18next";

interface Organization {
  _id: string;
  name: string;
  adminEmail?: string;
  createdAt: string;
  status: string;
}

interface PendingOrganizationsTableProps {
  organizations: Organization[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  busyId: string | null;
}

export const PendingOrganizationsTable: React.FC<PendingOrganizationsTableProps> = ({
  organizations,
  onApprove,
  onReject,
  busyId,
}) => {
  const { t } = useTranslation();

  if (organizations.length === 0) {
    return <div className="pending-orgs-empty">{t("pendingOrganizations.noOrgsPending")}</div>;
  }

  return (
    <table className="pending-orgs-table">
      <thead>
        <tr>
          <th>{t("pendingOrganizations.tableHeaderOrgName")}</th>
          <th>{t("pendingOrganizations.tableHeaderRegistrationDate")}</th>
          <th>{t("pendingOrganizations.tableHeaderStatus")}</th>
          <th>{t("pendingOrganizations.tableHeaderActions")}</th>
        </tr>
      </thead>
      <tbody>
        {organizations.map((org) => (
          <tr key={org._id}>
            <td>{org.name}</td>
            <td>{new Date(org.createdAt).toLocaleDateString("he-IL")}</td>
            <td>
              <span className={`status-badge ${org.status}`}>
                {org.status === "pending" ? t("pendingOrganizations.pendingStatus") : org.status}
              </span>
            </td>
            <td>
              <button
                className="btn-approve"
                onClick={() => onApprove(org._id)}
                disabled={busyId === org._id}
                style={{ marginLeft: '8px', cursor: 'pointer' }}
              >
                {busyId === org._id
                  ? t("pendingOrganizations.processingButton")
                  : t("pendingOrganizations.approveButton")}
              </button>
              <button
                className="btn-reject"
                onClick={() => onReject(org._id)}
                disabled={busyId === org._id}
                style={{ cursor: 'pointer' }}
              >
                {busyId === org._id
                  ? t("pendingOrganizations.processingButton")
                  : t("pendingOrganizations.rejectButton")}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};