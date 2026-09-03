import { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { createOrganizationMember, getMyOrganization } from "../features/organizations/api/organizationApi";
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

      const token = localStorage.getItem("accessToken");

      if (!token) {
        setError("לא נמצא טוקן גישה. אנא התחברי מחדש.");
        return;
      }

      const { organization: myOrg } = await getMyOrganization();

      if (!myOrg) {
        setNoOrganization(true);
        return;
      }

      setOrganization(myOrg as unknown as Organization);

      const usersResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/organizations/${myOrg._id}/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUsers(usersResponse.data);
    } catch (err: unknown) {
      console.error("Error fetching organization users:", err);

      let serverError = "Failed to fetch organization users";

      if (axios.isAxiosError(err)) {
        if (err.response?.data) {
          serverError =
            typeof err.response.data === "string"
              ? err.response.data
              : err.response.data.error ||
              err.response.data.message ||
              JSON.stringify(err.response.data);
        } else if (err.message) {
          serverError = err.message;
        }

        const failedUrl = err.config?.url ? ` (נתיב: ${err.config.url})` : "";
        setError(`${serverError}${failedUrl}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(serverError);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization || !topUpAmount || topUpAmount <= 0) return;

    try {
      setIsSubmitting(true);

      const token = localStorage.getItem("accessToken");

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/organizations/${organization._id}/top-up`,
        { amount: Number(topUpAmount) },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert(
        `הארנק נטען בהצלחה! יתרה חדשה: $${response.data.organization.walletBalance}`
      );

      setOrganization(response.data.organization);
      setTopUpAmount("");
    } catch (err: unknown) {
      console.error("Error topping up wallet:", err);

      if (axios.isAxiosError(err)) {
        const errorMsg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          "נכשל הטעינה לארנק";

        alert(errorMsg);
      } else if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("נכשל הטעינה לארנק");
      }
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

      const token = localStorage.getItem("accessToken");

      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/organizations/${organization._id}`,
        { name: editName, description: editDescription },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setOrganization(response.data.organization);
      setIsEditingOrg(false);
    } catch (err: unknown) {
      console.error("Error updating organization:", err);

      if (axios.isAxiosError(err)) {
        const errorMsg =
          err.response?.data?.error ||
          err.response?.data?.message ||
          "נכשל עדכון פרטי הארגון";

        alert(errorMsg);
      } else if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("נכשל עדכון פרטי הארגון");
      }
    } finally {
      setIsSavingOrg(false);
    }
  };

  const reloadUsers = async () => {
    if (!organization) return;
    const token = localStorage.getItem("accessToken");
    const usersResponse = await axios.get(
      `${import.meta.env.VITE_API_URL}/organizations/${organization._id}/users`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setUsers(usersResponse.data);
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
                    // Darkened from the original #4CAF50/#2196F3 - white text on
                    // those failed WCAG AA contrast (~2.7:1 / ~3.1:1); these pass (~5:1+).
                    // Kept as fixed hex rather than --color-success/--color-info: those
                    // theme variables are ~3.3:1/~4.1:1 in light mode, below AA.
                    backgroundColor: user.role === "org_owner" ? "#2e7d32" : "#1565c0",
                    color: "white",
                    fontSize: "12px"
                  }}>
                    {user.role === "org_owner" ? "בעל ארגון" : user.role === "admin" ? "מנהל מערכת" : "משתמש"}
                  </span>
                </td>
                <td className="status-cell">
                  <span className="status-pill" style={{
                    // Darkened for contrast (see role badge above) + a leading
                    // glyph so the state doesn't rely on color alone.
                    backgroundColor: user.isActive ? "#2e7d32" : "#c62828"
                  }}>
                    {user.isActive ? "✓ פעיל" : "✕ לא פעיל"}
                  </span>
                </td>
                <td className="status-cell">
                  <span className="status-pill" style={{
                    backgroundColor: user.lastLogin ? "#2e7d32" : "#c62828"
                  }}>
                    {user.lastLogin ? "✓ הצטרף" : "⏳ ממתין להתחברות ראשונה"}
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