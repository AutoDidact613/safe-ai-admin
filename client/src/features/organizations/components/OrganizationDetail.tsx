import { useEffect, useState } from "react";
import {
  createOrganizationMember,
  getOrganizationDetail,
  getOrganizationStats,
  getOrganizationUsers,
} from "../api/organizationApi";
import type {
  AdminOrganization,
  OrganizationUsageSummary,
  OrganizationUser,
} from "../api/organizationApi";

interface OrganizationDetailProps {
  orgId: string;
  onBack: () => void;
}

export const OrganizationDetail = ({ orgId, onBack }: OrganizationDetailProps) => {
  const [org, setOrg] = useState<AdminOrganization | null>(null);
  const [stats, setStats] = useState<OrganizationUsageSummary | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const reloadUsers = async () => {
    const usersData = await getOrganizationUsers(orgId);
    setUsers(Array.isArray(usersData) ? usersData : []);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !memberEmail.trim()) {
      setAddMemberError("יש למלא שם וכתובת אימייל");
      return;
    }
    try {
      setAddingMember(true);
      setAddMemberError(null);
      const result = await createOrganizationMember(orgId, {
        name: memberName.trim(),
        email: memberEmail.trim(),
      });
      setCreatedCredentials({ email: result.user.email, password: result.temporaryPassword });
      setMemberName("");
      setMemberEmail("");
      await reloadUsers();
    } catch (err: unknown) {
      setAddMemberError(err instanceof Error ? err.message : "הוספת המשתמש נכשלה");
    } finally {
      setAddingMember(false);
    }
  };

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      try {
        setLoading(true);
        const [orgData, statsData, usersData] = await Promise.all([
          getOrganizationDetail(orgId),
          getOrganizationStats(orgId),
          getOrganizationUsers(orgId),
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
  }, [orgId]);

  if (loading) return <div className="orgs-loading">טוען פרטי ארגון...</div>;
  if (error) return <div className="orgs-error">שגיאה: {error}</div>;
  if (!org) return <div className="orgs-error">ארגון לא נמצא</div>;

  return (
    <div>
      <button
        type="button"
        className="org-detail-back"
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        → חזרה לרשימת הארגונים
      </button>

      <div className="orgs-admin-header">
        <h2 className="orgs-admin-title">{org.name}</h2>
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

      <h3>הוספת משתמש חדש לארגון</h3>
      <form onSubmit={handleAddMember} className="org-request-form">
        <input
          className="orgs-search"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          placeholder="שם מלא"
        />
        <input
          type="email"
          className="orgs-search"
          value={memberEmail}
          onChange={(e) => setMemberEmail(e.target.value)}
          placeholder="כתובת אימייל"
        />
        {addMemberError && <div className="orgs-error">{addMemberError}</div>}
        <button type="submit" className="orgs-btn orgs-btn-activate" disabled={addingMember}>
          {addingMember ? "מוסיף..." : "הוסף משתמש"}
        </button>
      </form>

      {createdCredentials && (
        <div className="org-pending-card">
          <p>המשתמש נוצר בהצלחה! פרטי ההתחברות שיש למסור לו:</p>
          <p>
            <strong>אימייל:</strong> {createdCredentials.email}
          </p>
          <p>
            <strong>סיסמה זמנית:</strong> {createdCredentials.password}
          </p>
        </div>
      )}

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