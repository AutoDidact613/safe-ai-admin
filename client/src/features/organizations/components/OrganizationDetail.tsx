import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import {
  createOrganizationMember,
  getOrganizationDetail,
  getOrganizationStats,
  getOrganizationUsers,
} from "../api/organizationApi";
import type {
  AdminOrganization,
  OrganizationUsageSummary,
  OrganizationUser,
} from "../api/organizationApi";

interface OrganizationDetailProps {
  orgId: string;
  onBack: () => void;
}

export const OrganizationDetail = ({ orgId, onBack }: OrganizationDetailProps) => {
  const [org, setOrg] = useState<AdminOrganization | null>(null);
  const [stats, setStats] = useState<OrganizationUsageSummary | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [createdMembers, setCreatedMembers] = useState<
    { name: string; email: string; password: string }[]
  >([]);
  const { t } = useTranslation();

  const reloadUsers = async () => {
    const usersData = await getOrganizationUsers(orgId);
    setUsers(Array.isArray(usersData) ? usersData : []);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !memberEmail.trim()) {
      setAddMemberError(t("organizations.addMemberErrorRequired"));
      return;
    }
    try {
      setAddingMember(true);
      setAddMemberError(null);
      const result = await createOrganizationMember(orgId, {
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
      setAddMemberError(err instanceof Error ? err.message : t("organizations.addMemberFailedFallback"));
    } finally {
      setAddingMember(false);
    }
  };

  const handleDownloadExcel = () => {
    const loginUrl = `${window.location.origin}/login`;
    const rows = createdMembers.map((m) => ({
      [t("orgUsers.tableHeaders.name")]: m.name,
      [t("orgUsers.tableHeaders.email")]: m.email,
      [t("orgUsers.tableHeaders.password")]: m.password,
      [t("organizations.loginLinkColumn")]: loginUrl,
      [t("pendingOrganizations.tableHeaderStatus")]: t("orgUsers.pendingFirstLoginLabel"),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("organizations.newUsersSheetName"));
    XLSX.writeFile(workbook, `${t("organizations.usersFilePrefix")}-${org?.name || t("organizations.orgFallbackName")}.xlsx`);
  };

  useEffect(() => {
    if (!orgId) return;
    const load = async () => {
      try {
        setLoading(true);
        const [orgData, statsData, usersData] = await Promise.all([
          getOrganizationDetail(orgId),
          getOrganizationStats(orgId),
          getOrganizationUsers(orgId),
        ]);
        setOrg(orgData);
        setStats(statsData);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : t("organizations.loadOrgDetailsFailedFallback"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orgId]);

  if (loading) return <div className="orgs-loading">{t("organizations.loadingOrgDetails")}</div>;
  if (error) return <div className="orgs-error">{t("organizations.errorPrefix")} {error}</div>;
  if (!org) return <div className="orgs-error">{t("organizations.orgNotFound")}</div>;

  return (
    <div>
      <button
        type="button"
        className="org-detail-back"
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        {t("organizations.backToOrgsListBtn")}
      </button>

      <div className="orgs-admin-header">
        <h2 className="orgs-admin-title">{org.name}</h2>
        <span className={`status-badge ${org.isActive ? "active" : "inactive"}`}>
          {org.isActive ? t("orgUsers.active") : t("organizations.statusSuspended")}
        </span>
      </div>
      {org.description && <p className="orgs-admin-subtitle">{org.description}</p>}
      <p className="orgs-admin-subtitle">{t("organizations.ownerLabel")} {org.ownerId?.email || "-"}</p>

      <div className="org-detail-cards">
        <div className="org-card">
          <div className="org-card-label">{t("organizations.usersLabel")}</div>
          <div className="org-card-value">{stats?.userCount ?? users.length}</div>
        </div>
        <div className="org-card">
          <div className="org-card-label">{t("organizations.walletBalanceLabel")}</div>
          <div className="org-card-value">${(stats?.walletBalance ?? org.walletBalance ?? 0).toFixed(2)}</div>
        </div>
        <div className="org-card">
          <div className="org-card-label">{t("organizations.totalRequestsCard")}</div>
          <div className="org-card-value">{stats?.totalRequests ?? 0}</div>
        </div>
        <div className="org-card">
          <div className="org-card-label">{t("organizations.totalTokensCard")}</div>
          <div className="org-card-value">{(stats?.totalTokens ?? 0).toLocaleString()}</div>
        </div>
        <div className="org-card">
          <div className="org-card-label">{t("organizations.cumulativeCostCard")}</div>
          <div className="org-card-value">${(stats?.totalCost ?? 0).toFixed(2)}</div>
        </div>
      </div>

      <h3>{t("orgUsers.addMemberTitle")}</h3>
      <form onSubmit={handleAddMember} className="org-request-form">
        <input
          className="orgs-search"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          placeholder={t("orgUsers.fullNamePlaceholder")}
        />
        <input
          type="email"
          className="orgs-search"
          value={memberEmail}
          onChange={(e) => setMemberEmail(e.target.value)}
          placeholder={t("orgUsers.emailPlaceholder")}
        />
        {addMemberError && <div className="orgs-error">{addMemberError}</div>}
        <button type="submit" className="orgs-btn orgs-btn-activate" disabled={addingMember}>
          {addingMember ? t("orgUsers.addingButton") : t("orgUsers.addMemberButton")}
        </button>
      </form>

      {createdMembers.length > 0 && (
        <div className="org-pending-card">
          <p>{t("orgUsers.createdMembersMessage", { count: createdMembers.length })}</p>
          <table className="orgs-table">
            <thead>
              <tr>
                <th>{t("orgUsers.tableHeaders.name")}</th>
                <th>{t("orgUsers.tableHeaders.email")}</th>
                <th>{t("orgUsers.tableHeaders.password")}</th>
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
          <button type="button" className="orgs-btn orgs-btn-activate" onClick={handleDownloadExcel}>
            {t("orgUsers.downloadExcelButton")}
          </button>
        </div>
      )}

      <h3>{t("organizations.orgUsersCountTitle", { count: users.length })}</h3>
      {users.length === 0 ? (
        <div className="orgs-empty">{t("organizations.noUsersInOrg")}</div>
      ) : (
        <table className="orgs-table">
          <thead>
            <tr>
              <th>{t("orgUsers.tableHeaders.email")}</th>
              <th>{t("orgUsers.tableHeaders.name")}</th>
              <th>{t("orgUsers.tableHeaders.role")}</th>
              <th>{t("organizations.activityColumn")}</th>
              <th>{t("orgUsers.tableHeaders.joinStatus")}</th>
              <th>{t("organizations.addedOnColumn")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.email}</td>
                <td>{u.name || "-"}</td>
                <td>{u.role}</td>
                <td>
                  <span className={`status-badge ${u.isActive ? "active" : "inactive"}`}>
                    {u.isActive ? t("orgUsers.active") : t("orgUsers.inactive")}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${u.lastLogin ? "active" : "inactive"}`}>
                    {u.lastLogin ? t("orgUsers.joinedLabel") : t("orgUsers.pendingFirstLoginLabel")}
                  </span>
                </td>
                <td>{new Date(u.createdAt).toLocaleDateString("he-IL")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};