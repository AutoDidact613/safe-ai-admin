import * as React from "react";

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

export const PendingOrganizationsTable = ({ organizations }: PendingOrganizationsTableProps) => {
  if (organizations.length === 0) {
    return <div className="pending-orgs-empty">אין ארגונים הממתינים לאישור כעת.</div>;
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
            <td className="pending-orgs-name">{org.name}</td>
            <td>{new Date(org.createdAt).toLocaleDateString("he-IL")}</td>
            <td>
              <span className="status-badge pending">{org.status}</span>
            </td>
            <td>
              <button className="btn btn-approve">אשר</button>
              <button className="btn btn-reject">דחה</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};