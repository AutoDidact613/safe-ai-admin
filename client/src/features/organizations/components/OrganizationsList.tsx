import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getAllOrganizations,
  suspendOrganization,
  activateOrganization,
} from "../api/organizationApi";
import type { AdminOrganization } from "../api/organizationApi";
import { OrganizationsTable } from "./OrganizationsTable";

type StatusFilter = "all" | "active" | "suspended" | "pending" | "approved" | "rejected";

interface OrganizationsListProps {
  onOpenOrg: (id: string) => void;
}

export const OrganizationsList = ({ onOpenOrg }: OrganizationsListProps) => {
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { t } = useTranslation();

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await getAllOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("organizations.loadOrgsFailedFallback"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const filtered = useMemo(() => {
    return organizations.filter((org) => {
      const matchesSearch = (org.name ?? "").toLowerCase().includes(search.trim().toLowerCase());
      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = org.isActive === true;
      else if (statusFilter === "suspended") matchesStatus = org.isActive === false;
      else if (statusFilter !== "all") matchesStatus = org.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [organizations, search, statusFilter]);

  const handleSuspend = async (id: string) => {
    if (!window.confirm(t("organizations.confirmSuspendOrg"))) return;
    try {
      setBusyId(id);
      await suspendOrganization(id);
      setOrganizations((prev) => prev.map((o) => (o._id === id ? { ...o, isActive: false } : o)));
    } catch (err: unknown) {
      alert(t("organizations.suspendErrorAlert", { error: err instanceof Error ? err.message : t("organizations.genericFailedFallback") }));
    } finally {
      setBusyId(null);
    }
  };

  const handleActivate = async (id: string) => {
    if (!window.confirm(t("organizations.confirmActivateOrg"))) return;
    try {
      setBusyId(id);
      await activateOrganization(id);
      setOrganizations((prev) => prev.map((o) => (o._id === id ? { ...o, isActive: true } : o)));
    } catch (err: unknown) {
      alert(t("organizations.activateErrorAlert", { error: err instanceof Error ? err.message : t("organizations.genericFailedFallback") }));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="orgs-loading">{t("organizations.loadingOrgsList")}</div>;
  if (error) return <div className="orgs-error">{t("organizations.errorPrefix")} {error}</div>;

  return (
    <div>
      <p className="orgs-admin-subtitle">{t("organizations.allOrgsSubtitle", { count: organizations.length })}</p>

      <div className="orgs-toolbar">
        <input
          className="orgs-search"
          type="text"
          placeholder={t("organizations.searchByOrgNamePlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="orgs-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">{t("organizations.allStatusesOption")}</option>
          <option value="active">{t("orgUsers.active")}</option>
          <option value="suspended">{t("organizations.statusSuspended")}</option>
          <option value="pending">{t("organizations.statusPendingApproval")}</option>
          <option value="approved">{t("organizations.statusApproved")}</option>
          <option value="rejected">{t("organizations.statusRejected")}</option>
        </select>
      </div>

      <OrganizationsTable
        organizations={filtered}
        onOpen={onOpenOrg}
        onSuspend={handleSuspend}
        onActivate={handleActivate}
        busyId={busyId}
      />
    </div>
  );
};
