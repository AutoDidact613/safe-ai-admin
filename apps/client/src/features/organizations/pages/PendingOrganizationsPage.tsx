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
  const [busyId, setBusyId] = useState<string | null>(null);

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
    const org = organizations.find((o) => o._id === id);
    if (!window.confirm(`לאשר את הארגון "${org?.name ?? ""}"?`)) return;

    try {
      setBusyId(id);
      await updateOrganizationStatus(id, "approved");
      setOrganizations((prev) => prev.filter((o) => o._id !== id));
      alert(t("pendingOrganizations.approveSuccess"));
    } catch (err: unknown) {
      console.error(err);
      alert(t("pendingOrganizations.updateErrorPrefix", { message: err instanceof Error ? err.message : t("pendingOrganizations.actionFailedDefault") }));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    const org = organizations.find((o) => o._id === id);
    if (!window.confirm(`לדחות את הארגון "${org?.name ?? ""}"? הפעולה אינה הפיכה.`)) return;

    try {
      setBusyId(id);
      await updateOrganizationStatus(id, "rejected");
      setOrganizations((prev) => prev.filter((o) => o._id !== id));
      alert(t("pendingOrganizations.rejectSuccess"));
    } catch (err: unknown) {
      console.error(err);
      alert(t("pendingOrganizations.updateErrorPrefix", { message: err instanceof Error ? err.message : t("pendingOrganizations.actionFailedDefault") }));
    } finally {
      setBusyId(null);
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
        busyId={busyId}
      />
    </div>
  );
};