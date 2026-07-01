import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getOrganizationDetail,
  getOrganizationStats,
  getOrganizationUsers,
} from "../api/organizationApi";
import type {
  AdminOrganization,
  OrganizationUsageSummary,
  OrganizationUser,
} from "../api/organizationApi";
import "../../../styles/organizations-admin.css";

export const OrganizationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [org, setOrg] = useState<AdminOrganization | null>(null);
  const [stats, setStats] = useState<OrganizationUsageSummary | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        const [orgData, statsData, usersData] = await Promise.all([
          getOrganizationDetail(id),
          getOrganizationStats(id),
          getOrganizationUsers(id),
        ]);
        setOrg(orgData);
        setStats(statsData);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "נכשלה טעינת פרטי הארגון");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="orgs-loading">טוען פרטי ארגון...</div>;
  if (error) return <div className="orgs-error">שגיאה: {error}</div>;
  if (!org) return <div className="orgs-error">ארגון לא נמצא</div>;

  return (
    <div className="orgs-admin-container">
      <Link className="org-detail-back" to="/admin/organizations/all">→ חזרה לרשימת הארגונים</Link>

      <div className="orgs-admin-header">
        <h1 className="orgs-admin-title">{org.name}</h1>
        <span className={`status-badge ${org.isActive ? "active" : "inactive"}`}>
          {org.isActive ? "פעיל" : "מושעה"}
        </span>
      </div>
      {org.description && <p className="orgs-admin-subtitle">{org.description}</p>}
      <p className="orgs-admin-subtitle">בעלים: {org.ownerId?.email || "-"}</p>

      <div className="org-detail-cards">
        <div className="org-card">
          <div className="org-card-label">משתמשים</div>
          <div className="org-card-value">{stats?.userCount ?? users.length}</div>
        </div>
        <div className="org-card">
          <div className="org-card-label">יתרת ארנק</div>
          <div className="org-card-value">${(stats?.walletBalance ?? org.walletBalance ?? 0).toFixed(2)}</div>
        </div>
        <div className="org-card">
          <div className="org-card-label">סה"כ בקשות</div>
          <div className="org-card-value">{stats?.totalRequests ?? 0}</div>
        </div>
        <div className="org-card">
          <div className="org-card-label">סה"כ טוקנים</div>
          <div className="org-card-value">{(stats?.totalTokens ?? 0).toLocaleString()}</div>
        </div>
        <div className="org-card">
          <div className="org-card-label">עלות מצטברת</div>
          <div className="org-card-value">${(stats?.totalCost ?? 0).toFixed(2)}</div>
        </div>
      </div>

      <h3>משתמשי הארגון ({users.length})</h3>
      {users.length === 0 ? (
        <div className="orgs-empty">אין משתמשים בארגון זה</div>
      ) : (
        <table className="orgs-table">
          <thead>
            <tr>
              <th>אימייל</th>
              <th>שם</th>
              <th>תפקיד</th>
              <th>פעילות</th>
              <th>הצטרף</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.email}</td>
                <td>{u.name || "-"}</td>
                <td>{u.role}</td>
                <td>
                  <span className={`status-badge ${u.isActive ? "active" : "inactive"}`}>
                    {u.isActive ? "פעיל" : "לא פעיל"}
                  </span>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString("he-IL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
