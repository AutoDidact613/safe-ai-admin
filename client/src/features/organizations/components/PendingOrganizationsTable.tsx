import React from "react";

interface Organization {
  _id: string;
  name: string;
  adminEmail?: string;
  createdAt: string;
  status: string;
}

interface PendingOrganizationsTableProps {
  organizations: Organization[];
}

export const PendingOrganizationsTable: React.FC<PendingOrganizationsTableProps> = ({ organizations }) => {
  if (organizations.length === 0) {
    return <div className="pending-orgs-empty">כעת אין ארגונים ממתינים לאישור</div>;
  }

  return (
    <table className="pending-orgs-table">
      <thead>
        <tr>
          <th>שם הארגון</th>
          <th>תאריך הרשמה</th>
          <th>סטטוס</th>
          <th>פעולות</th>
        </tr>
      </thead>
      <tbody>
        {organizations.map((org) => (
          <tr key={org._id}>
            <td>{org.name}</td>
            <td>{new Date(org.createdAt).toLocaleDateString("he-IL")}</td>
            <td>
              <span className={`status-badge ${org.status}`}>
                {org.status === "pending" ? "ממתין" : org.status}
              </span>
            </td>
            <td>
              <button className="btn-approve">אישור</button>
              <button className="btn-reject">דחייה</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};