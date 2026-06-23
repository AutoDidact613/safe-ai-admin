import * as React from "react";
import { useEffect, useState } from "react";
import { getPendingOrganizations, updateOrganizationStatus } from "../api/organizationApi";
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

  // פונקציית טיפול אמיתית שמעדכנת את מונגו ל-approved
  const handleApprove = async (id: string) => {
    try {
      await updateOrganizationStatus(id, "approved");
      // מסננים החוצה מה-State כדי שייעלם מיידית מהמסך
      setOrganizations((prev) => prev.filter((org) => org._id !== id));
      alert("הארגון אושר בהצלחה בבסיס הנתונים!");
    } catch (err: any) {
      console.error(err);
      alert(`שגיאה בעדכון הארגון: ${err.message || "נכשלה הפעולה"}`);
    }
  };

  // פונקציית טיפול אמיתית שמעדכנת את מונגו ל-rejected
  const handleReject = async (id: string) => {
    try {
      await updateOrganizationStatus(id, "rejected");
      // מסננים החוצה מה-State כדי שייעלם מיידית מהמסך
      setOrganizations((prev) => prev.filter((org) => org._id !== id));
      alert("הארגון נדחה בהצלחה בבסיס הנתונים!");
    } catch (err: any) {
      console.error(err);
      alert(`שגיאה בעדכון הארגון: ${err.message || "נכשלה הפעולה"}`);
    }
  };

  if (loading) return <div className="pending-orgs-loading">טוען ארגונים ממתינים...</div>;
  if (error) return <div className="pending-orgs-error">שגיאה: {error}</div>;

  return (
    <div className="pending-orgs-container">
      <h1 className="pending-orgs-title">אישור ארגונים (System Admin)</h1>
      <p className="pending-orgs-subtitle">לפניך רשימת הארגונים הממתינים לאישור הגישה שלהם.</p>
      
      <PendingOrganizationsTable 
        organizations={organizations} 
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
};