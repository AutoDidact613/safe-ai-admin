import * as React from "react";
import { useEffect, useState } from "react";
import { getPendingOrganizations } from "../api/organizationApi";
import { PendingOrganizationsTable } from "../components/PendingOrganizationsTable";
import "../../../styles/pending-organizations-page.css";

interface Organization {
  _id: string;
  name: string;
  adminEmail?: string;
  createdAt: string;
  status: string;
}

export const PendingOrganizationsPage = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const response = await getPendingOrganizations();
        if (response && response.data) {
          setOrganizations(response.data);
        } else {
          setOrganizations(response || []);
        }
      } catch (err: any) {
        setError(err.message || "נכשלה טעינת הארגונים הממתינים");
      } finally {
        setLoading(false);
      }
    };
    fetchOrganizations();
  }, []);

  if (loading) return <div className="pending-orgs-loading">טוען ארגונים ממתינים...</div>;
  if (error) return <div className="pending-orgs-error">שגיאה: {error}</div>;

  return (
    <div className="pending-orgs-container">
      <h1 className="pending-orgs-title">אישור ארגונים (System Admin)</h1>
      <p className="pending-orgs-subtitle">לפניך רשימת הארגונים הממתינים לאישור הגישה שלהם.</p>
      <PendingOrganizationsTable organizations={organizations} />
    </div>
  );
};