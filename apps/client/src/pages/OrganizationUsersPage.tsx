import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  createOrganizationMember,
  getMyOrganization,
  getOrganizationUsers,
  topUpOrganizationWallet,
  updateOrganizationDetails,
} from "../features/organizations/api/organizationApi";
import "../styles/organization-wallet.css";

interface User {
  _id: string;
  email: string;
  name?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  mode: string;
  lastLogin?: string;
}

interface Organization {
  _id: string;
  name: string;
  description: string;
  ownerId: OrganizationOwner;
  isActive: boolean;
  walletBalance?: number;
}

interface OrganizationOwner {
  _id: string;
  email?: string;
  name?: string;
}

export default function OrganizationUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noOrganization, setNoOrganization] = useState(false);

  const [topUpAmount, setTopUpAmount] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [createdMembers, setCreatedMembers] = useState<
    { name: string; email: string; password: string }[]
  >([]);

  useEffect(() => {
    fetchOrganizationAndUsers();
  }, []);

  const fetchOrganizationAndUsers = async () => {
    try {
      setLoading(true);
      setError("");
      setNoOrganization(false);

      const { organization: myOrg } = await getMyOrganization();

      if (!myOrg) {
        setNoOrganization(true);
        return;
      }

      setOrganization(myOrg as unknown as Organization);

      const usersData = await getOrganizationUsers(myOrg._id);
      setUsers(usersData as unknown as User[]);
    } catch (err: unknown) {
      console.error("Error fetching organization users:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch organization users");
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization || !topUpAmount || topUpAmount <= 0) return;

    try {
      setIsSubmitting(true);

      const { organization: updatedOrg } = await topUpOrganizationWallet(
        organization._id,
        Number(topUpAmount)
      );

      alert(`הארנק נטען בהצלחה! יתרה חדשה: $${updatedOrg.walletBalance}`);

      setOrganization(updatedOrg as unknown as Organization);
      setTopUpAmount("");
    } catch (err: unknown) {
      console.error("Error topping up wallet:", err);
      alert(err instanceof Error ? err.message : "נכשל הטעינה לארנק");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingOrg = () => {
    if (!organization) return;
    setEditName(organization.name);
    setEditDescription(organization.description || "");
    setIsEditingOrg(true);
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization) return;

    try {
      setIsSavingOrg(true);

      const { organization: updatedOrg } = await updateOrganizationDetails(organization._id, {
        name: editName,
        description: editDescription,
      });

      setOrganization(updatedOrg as unknown as Organization);
      setIsEditingOrg(false);
    } catch (err: unknown) {
      console.error("Error updating organization:", err);
      alert(err instanceof Error ? err.message : "נכשל עדכון פרטי הארגון");
    } finally {
      setIsSavingOrg(false);
    }
  };

  const reloadUsers = async () => {
    if (!organization) return;
    const usersData = await getOrganizationUsers(organization._id);
    setUsers(usersData as unknown as User[]);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !memberName.trim() || !memberEmail.trim()) {
      setAddMemberError("יש למלא שם וכתובת אימייל");
      return;
    }
    try {
      setAddingMember(true);
      setAddMemberError(null);
      const result = await createOrganizationMember(organization._id, {
        name: memberName.trim(),
        email: memberEmail.trim(),
      });
      setCreatedMembers((prev) => [
        ...prev,
        {
          name: result.user.name || memberName.trim(),
          email: result.user.email,
          password: result.temporaryPassword,
        },
      ]);
      setMemberName("");
      setMemberEmail("");
      await reloadUsers();
    } catch (err: unknown) {
      setAddMemberError(err instanceof Error ? err.message : "הוספת המשתמש נכשלה");
    } finally {
      setAddingMember(false);
    }
  };

  const handleDownloadExcel = () => {
    const loginUrl = `${window.location.origin}/login`;
    const rows = createdMembers.map((m) => ({
      "שם": m.name,
      "אימייל": m.email,
      "סיסמה זמנית": m.password,
      "קישור להתחברות": loginUrl,
      "סטטוס": "ממתין להתחברות ראשונה",
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "משתמשים חדשים");
    XLSX.writeFile(workbook, `משתמשי-${organization?.name || "ארגון"}.xlsx`);
  };

  if (loading) {
    return (
      <div className="organization-page">
        <h1>לוח ארגון</h1>
        <p>טוען נתונים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="organization-page">
        <h1>לוח ארגון</h1>
        <p className="error-title">שגיאה בטעינת הנתונים:</p>
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={fetchOrganizationAndUsers}>
          ניסיון חוזר
        </button>
      </div>
    );
  }

  if (noOrganization) {
    return (
      <div className="organization-page">
        <h1>לוח ארגון</h1>
        <p>אין לך ארגון משויך לחשבון זה.</p>
      </div>
    );
  }

  return (
    <div className="organization-page">
      <h1>לוח ארגון</h1>

      {organization && (
        <div className="organization-grid">
          <div className="organization-info-card">
            {isEditingOrg ? (
              <form onSubmit={handleSaveOrg} className="org-edit-form">
                <input
                  type="text"
                  dir="rtl"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="org-edit-input"
                  placeholder="שם הארגון"
                />
                <textarea
                  dir="rtl"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="org-edit-input"
                  placeholder="תיאור הארגון"
                  rows={3}
                />
                <p><strong>סטטוס:</strong> {organization.isActive ? "פעיל" : "לא פעיל"}</p>
                <div className="org-edit-actions">
                  <button type="submit" disabled={isSavingOrg} className="topup-button">
                    {isSavingOrg ? "שומר..." : "שמירה"}
                  </button>
                  <button
                    type="button"
                    className="retry-button"
                    disabled={isSavingOrg}
                    onClick={() => setIsEditingOrg(false)}
                  >
                    ביטול
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="org-info-header">
                  <h2>{organization.name}</h2>
                  <button className="org-edit-button" onClick={startEditingOrg}>
                    עריכה
                  </button>
                </div>
                <p>{organization.description || "אין תיאור זמין."}</p>
                <p><strong>סטטוס:</strong> {organization.isActive ? "פעיל" : "לא פעיל"}</p>
              </>
            )}
          </div>

          <div className="wallet-card">
            <h3 className="wallet-title">💳 ארנק ארגון</h3>
            <p className="wallet-balance">
              יתרת חשבון: <strong className="wallet-balance-amount">${organization.walletBalance ?? 0}</strong>
            </p>

            <div className="simulation-warning">
              ⚠️ <strong>סביבת סימולציה:</strong> זהו מערכת מדומה. לא ייגבו חיובים בכרטיס אשראי אמיתי.
            </div>

            <form onSubmit={handleTopUp} className="topup-form">
              <input
                type="number"
                min="1"
                dir="rtl"
                placeholder="הכנס סכום ($)"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                required
                className="topup-input"
              />
              <button type="submit" disabled={isSubmitting} className="topup-button">
                {isSubmitting ? "מעבד..." : "הטען"}
              </button>
            </form>
          </div>
        </div>
      )}

      <h3>הוספת משתמש חדש לארגון</h3>
      <form onSubmit={handleAddMember} className="org-edit-form">
        <input
          type="text"
          dir="rtl"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          placeholder="שם מלא"
          className="org-edit-input"
        />
        <input
          type="email"
          dir="rtl"
          value={memberEmail}
          onChange={(e) => setMemberEmail(e.target.value)}
          placeholder="כתובת אימייל"
          className="org-edit-input"
        />
        {addMemberError && <p className="error-text">{addMemberError}</p>}
        <button type="submit" disabled={addingMember} className="topup-button">
          {addingMember ? "מוסיף..." : "הוסף משתמש"}
        </button>
      </form>

      {createdMembers.length > 0 && (
        <div className="organization-info-card">
          <p>נוספו {createdMembers.length} משתמשים חדשים בסשן הזה. פרטי ההתחברות שיש למסור להם:</p>
          <table className="organization-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>אימייל</th>
                <th>סיסמה זמנית</th>
              </tr>
            </thead>
            <tbody>
              {createdMembers.map((m) => (
                <tr key={m.email}>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>{m.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="topup-button" onClick={handleDownloadExcel}>
            הורדת קובץ אקסל
          </button>
        </div>
      )}

      <h3>משתמשים בארגון ({users.length})</h3>

      {users.length === 0 ? (
        <p>לא נמצאו משתמשים בארגון זה.</p>
      ) : (
        <table className="organization-table">
          <thead>
            <tr>
              <th>אימייל</th>
              <th>שם</th>
              <th>תפקיד</th>
              <th>סטטוס</th>
              <th>סטטוס הצטרפות</th>
              <th>תאריך הצטרפות</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td>{user.email}</td>
                <td>{user.name || "-"}</td>
                <td>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    backgroundColor: user.role === "org_owner" ? "var(--color-success)" : "var(--color-info)",
                    color: "var(--text-inverse)",
                    fontSize: "12px"
                  }}>
                    {user.role === "org_owner" ? "בעל ארגון" : user.role === "admin" ? "מנהל מערכת" : "משתמש"}
                  </span>
                </td>
                <td className="status-cell">
                  <span className="status-pill" style={{
                    backgroundColor: user.isActive ? "var(--color-success)" : "var(--color-danger)"
                  }}>
                    {user.isActive ? "פעיל" : "לא פעיל"}
                  </span>
                </td>
                <td className="status-cell">
                  <span className="status-pill" style={{
                    backgroundColor: user.lastLogin ? "var(--color-success)" : "var(--color-danger)"
                  }}>
                    {user.lastLogin ? "הצטרף" : "ממתין להתחברות ראשונה"}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}