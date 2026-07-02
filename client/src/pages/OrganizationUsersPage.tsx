import { useEffect, useState } from "react";
import axios from "axios";
import "../styles/organization-wallet.css";

interface User {
  _id: string;
  email: string;
  name?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  mode: string;
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

  const [topUpAmount, setTopUpAmount] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  useEffect(() => {
    fetchOrganizationAndUsers();
  }, []);

  const fetchOrganizationAndUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("accessToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!token) {
        setError("לא נמצא טוקן גישה. אנא התחברי מחדש.");
        return;
      }

      const orgResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/organizations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!orgResponse.data || orgResponse.data.length === 0) {
        setError("לא נמצאו ארגונים במסד הנתונים (No organization found)");
        return;
      }

      const currentUserId = user.userId || user._id || user.id;

      let userOrg = orgResponse.data.find(
        (org: Organization) => (org.ownerId?._id || org.ownerId) === currentUserId
      );

      if (!userOrg && orgResponse.data.length > 0) {
        userOrg = orgResponse.data[0];
      }

      if (!userOrg) {
        setError("לא נמצא ארגון");
        return;
      }

      setOrganization(userOrg);

      const usersResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/organizations/${userOrg._id}/users`,
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
                    backgroundColor: user.role === "org_owner" ? "#4CAF50" : "#2196F3",
                    color: "white",
                    fontSize: "12px"
                  }}>
                    {user.role === "org_owner" ? "בעל ארגון" : user.role === "admin" ? "מנהל מערכת" : "משתמש"}
                  </span>
                </td>
                <td className="status-cell">
                  <span className="status-pill" style={{
                    backgroundColor: user.isActive ? "#4CAF50" : "#f44336"
                  }}>
                    {user.isActive ? "פעיל" : "לא פעיל"}
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