import React from "react";
import type { AdminOrganization } from "../api/organizationApi";

interface OrganizationsTableProps {
  organizations: AdminOrganization[];
  onOpen: (id: string) => void;
  onSuspend: (id: string) => void;
  onActivate: (id: string) => void;
  busyId: string | null;
}

function translateStatus(status: string): string {
  switch (status) {
    case "approved": return "מאושר";
    case "pending": return "ממתין";
    case "rejected": return "נדחה";
    default: return status || "לא מוגדר";
  }
}

export const OrganizationsTable: React.FC<OrganizationsTableProps> = ({
  organizations,
  onOpen,
  onSuspend,
  onActivate,
  busyId,
}) => {
  if (organizations.length === 0) {
    return <div className="orgs-empty">לא נמצאו ארגונים התואמים את החיפוש</div>;
  }

  return (
    <table className="orgs-table">
      <thead>
        <tr>
          <th>שם הארגון</th>
          <th>בעלים</th>
          <th>סטטוס</th>
          <th>פעילות</th>
          <th>משתמשים</th>
          <th>יתרת ארנק</th>
          <th>פעולות</th>
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
                {org.isActive ? "פעיל" : "מושעה"}
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
                  השעה
                </button>
              ) : (
                <button
                  className="orgs-btn orgs-btn-activate"
                  disabled={busyId === org._id}
                  onClick={() => onActivate(org._id)}
                >
                  הפעל
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
