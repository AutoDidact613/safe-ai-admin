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
        setError("No organization found");
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
    } catch (err: any) {
      console.error("Error fetching organization users:", err);
      
      let serverError = "Failed to fetch organization users";
      if (err.response?.data) {
        serverError = typeof err.response.data === 'string' 
          ? err.response.data 
          : (err.response.data.error || err.response.data.message || JSON.stringify(err.response.data));
      } else if (err.message) {
        serverError = err.message;
      }

      const failedUrl = err.config?.url ? ` (נתיב: ${err.config.url})` : "";
      setError(`${serverError}${failedUrl}`);
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
      
      alert(`Wallet topped up successfully! New balance: $${response.data.organization.walletBalance}`);
      setOrganization(response.data.organization);
      setTopUpAmount("");
    } catch (err: any) {
      console.error("Error topping up wallet:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || "Failed to top up wallet";
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Organization Dashboard</h1>
        <p>טוען נתונים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Organization Dashboard</h1>
        <p style={{ color: "red", fontWeight: "bold" }}>שגיאה בטעינת הנתונים:</p>
        <p style={{ color: "red", direction: "ltr" }}>{error}</p>
        <button onClick={fetchOrganizationAndUsers} style={{ marginTop: "15px", padding: "8px 16px", cursor: "pointer" }}>
          ניסיון חוזר
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Organization Dashboard</h1>
      
      {organization && (
        <div style={{ 
          display: "flex", 
          flexDirection: "row", 
          gap: "20px", 
          flexWrap: "wrap",
          marginBottom: "30px" 
        }}>
          <div style={{ flex: 1, minWidth: "300px", padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
            <h2>{organization.name}</h2>
            <p>{organization.description || "No description provided."}</p>
            <p><strong>Status:</strong> {organization.isActive ? "Active" : "Inactive"}</p>
          </div>

          <div className="wallet-card">
            <h3 className="wallet-title">💳 Organization Wallet</h3>
            <p className="wallet-balance">
              Current Balance: <strong className="wallet-balance-amount">${organization.walletBalance ?? 0}</strong>
            </p>

            <div className="simulation-warning">
              ⚠️ <strong>Simulation Environment:</strong> This is a mock system. No real credit card charge will be made.
            </div>

            <form onSubmit={handleTopUp} className="topup-form">
              <input
                type="number"
                min="1"
                placeholder="Enter amount ($)"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                required
                className="topup-input"
              />
              <button type="submit" disabled={isSubmitting} className="topup-button">
                {isSubmitting ? "Processing..." : "Top Up"}
              </button>
            </form>
          </div>
        </div>
      )}

      <h3>Users in Organization ({users.length})</h3>

      {users.length === 0 ? (
        <p>No users found in this organization.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Email</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Name</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Role</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Mode</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Status</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{user.email}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{user.name || "-"}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    backgroundColor: user.role === "org_owner" ? "#4CAF50" : "#2196F3",
                    color: "white",
                    fontSize: "12px"
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>{user.mode}</td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    backgroundColor: user.isActive ? "#4CAF50" : "#f44336",
                    color: "white",
                    fontSize: "12px"
                  }}>
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}