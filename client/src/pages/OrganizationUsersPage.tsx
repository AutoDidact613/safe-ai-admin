import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";

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
}

interface OrganizationOwner {
  _id: string;
  email?: string;
  name?: string;
}


export default function OrganizationUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOrganizationAndUsers();
  }, []);

  const fetchOrganizationAndUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (!token) {
        setError(t("orgUsers.notAuthenticated"));
        return;
      }

      // Get user's organization
      const orgResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/organizations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Find the organization where the user is the owner
      const userOrg = orgResponse.data.find(
        (org: Organization) => org.ownerId._id === user.userId || org.ownerId === user.userId
      );

      if (!userOrg) {
        setError(t("orgUsers.noOrganization"));
        return;
      }

      setOrganization(userOrg);

      // Get users in the organization
      const usersResponse = await axios.get(
        `${import.meta.env.VITE_API_URL}/organizations/${userOrg._id}/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setUsers(usersResponse.data);
    } catch (err: unknown) {
      console.error("Error fetching organization users:", err);
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || t("orgUsers.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>{t("orgUsers.title")}</h1>
        <p>{t("orgUsers.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>{t("orgUsers.title")}</h1>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>{t("orgUsers.title")}</h1>
      
      {organization && (
        <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
          <h2>{organization.name}</h2>
          <p>{organization.description}</p>
          <p><strong>{t("orgUsers.status")}</strong> {organization.isActive ? t("orgUsers.active") : t("orgUsers.inactive")}</p>
        </div>
      )}

      <h3>{t("orgUsers.usersInOrg")} ({users.length})</h3>

      {users.length === 0 ? (
        <p>{t("orgUsers.noUsers")}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f0f0f0" }}>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>{t("orgUsers.tableHeaders.email")}</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>{t("orgUsers.tableHeaders.name")}</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>{t("orgUsers.tableHeaders.role")}</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>{t("orgUsers.tableHeaders.mode")}</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>{t("orgUsers.tableHeaders.status")}</th>
              <th style={{ padding: "10px", textAlign: "left", border: "1px solid #ddd" }}>{t("orgUsers.tableHeaders.joined")}</th>
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
                    {user.isActive ? t("orgUsers.active") : t("orgUsers.inactive")}
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
