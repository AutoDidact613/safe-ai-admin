import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const response = await getPendingOrganizations();
        if (response && Array.isArray(response.data)) {
          setOrganizations(response.data as Organization[]);
        } else {
          setOrganizations([]);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("pendingOrganizations.loadFailedDefault"));
      } finally {
        setLoading(false);
      }
    };
    fetchOrganizations();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await updateOrganizationStatus(id, "approved");
      setOrganizations((prev) => prev.filter((org) => org._id !== id));
      alert(t("pendingOrganizations.approveSuccess"));
    } catch (err: unknown) {
      console.error(err);
      alert(t("pendingOrganizations.updateErrorPrefix", { message: err instanceof Error ? err.message : t("pendingOrganizations.actionFailedDefault") }));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateOrganizationStatus(id, "rejected");
      setOrganizations((prev) => prev.filter((org) => org._id !== id));
      alert(t("pendingOrganizations.rejectSuccess"));
    } catch (err: unknown) {
      console.error(err);
      alert(t("pendingOrganizations.updateErrorPrefix", { message: err instanceof Error ? err.message : t("pendingOrganizations.actionFailedDefault") }));
    }
  };

  if (loading) return <div className="pending-orgs-loading">{t("pendingOrganizations.loadingOrgs")}</div>;
  if (error) return <div className="pending-orgs-error">{t("statistics.errorLabel")} {error}</div>;

  return (
    <div className="pending-orgs-container">
      <h1 className="pending-orgs-title">{t("pendingOrganizations.pageTitle")}</h1>
      <p className="pending-orgs-subtitle">{t("pendingOrganizations.pageSubtitle")}</p>

      <PendingOrganizationsTable 
        organizations={organizations} 
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
};