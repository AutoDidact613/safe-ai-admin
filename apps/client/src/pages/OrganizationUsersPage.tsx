import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";
import {
  createOrganizationMember,
  getMyOrganization,
  getOrganizationUsers,
  updateOrganizationDetails,
} from "../features/organizations/api/organizationApi";
import { apiCall, API_ENDPOINTS } from "../config/api";
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
  const { t, i18n } = useTranslation();
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

      const { organization: myOrg } = await getMyOrganization();

      if (!myOrg) {
        setNoOrganization(true);
        return;
      }

      setOrganization(myOrg as unknown as Organization);

      const usersData = await getOrganizationUsers(myOrg._id);
      setUsers(usersData as unknown as User[]);
    } catch (err: unknown) {
      console.error("Error fetching organization users:", err);
      setError(err instanceof Error ? err.message : t("orgUsers.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!organization || !topUpAmount || topUpAmount <= 0) return;

    try {
      setIsSubmitting(true);

      const { iframeUrl } = await apiCall<{ iframeUrl: string; requestId: string }>(
        API_ENDPOINTS.payme.initiate(organization._id),
        {
          method: "POST",
          body: JSON.stringify({ amount: Number(topUpAmount) }),
        }
      );

      // Hand off to PayMe - it redirects back to our success/fail page
      // (see PaymeResultPage.tsx) once the payment is done.
      window.location.href = iframeUrl;
    } catch (err: unknown) {
      console.error("Error initiating wallet top-up:", err);
      alert(err instanceof Error ? err.message : "נכשלה יצירת בקשת התשלום");
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

      const { organization: updatedOrg } = await updateOrganizationDetails(organization._id, {
        name: editName,
        description: editDescription,
      });

      setOrganization(updatedOrg as unknown as Organization);
      setIsEditingOrg(false);
    } catch (err: unknown) {
      console.error("Error updating organization:", err);
      alert(err instanceof Error ? err.message : t("orgUsers.updateOrgFailedFallback"));
    } finally {
      setIsSavingOrg(false);
    }
  };

  const reloadUsers = async () => {
    if (!organization) return;
    const usersData = await getOrganizationUsers(organization._id);
    setUsers(usersData as unknown as User[]);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !memberName.trim() || !memberEmail.trim()) {
      setAddMemberError(t("orgUsers.addMemberFieldsRequired"));
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
      setAddMemberError(err instanceof Error ? err.message : t("orgUsers.addMemberFailedFallback"));
    } finally {
      setAddingMember(false);
    }
  };

  const handleDownloadExcel = () => {
    const loginUrl = `${window.location.origin}/login`;
    const rows = createdMembers.map((m) => ({
      [t("orgUsers.excelHeaderName")]: m.name,
      [t("orgUsers.excelHeaderEmail")]: m.email,
      [t("orgUsers.excelHeaderPassword")]: m.password,
      [t("orgUsers.excelHeaderLoginLink")]: loginUrl,
      [t("orgUsers.excelHeaderStatus")]: t("orgUsers.excelStatusPendingLogin"),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("orgUsers.excelSheetName"));
    XLSX.writeFile(workbook, `${t("orgUsers.excelFileNamePrefix")}-${organization?.name || t("orgUsers.excelFallbackOrgName")}.xlsx`);
    setCreatedMembers([]);
  };

  if (loading) {
    return (
      <div className="organization-page">
        <h1>{t("orgUsers.title")}</h1>
        <p>{t("orgUsers.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="organization-page">
        <h1>{t("orgUsers.title")}</h1>
        <p className="error-title">{t("orgUsers.errorTitle")}</p>
        <p className="error-text">{error}</p>
        <button className="retry-button" onClick={fetchOrganizationAndUsers}>
          {t("orgUsers.retryButton")}
        </button>
      </div>
    );
  }

  if (noOrganization) {
    return (
      <div className="organization-page">
        <h1>{t("orgUsers.title")}</h1>
        <p>{t("orgUsers.noOrgMessage")}</p>
      </div>
    );
  }

  return (
    <div className="organization-page">
      <h1>{t("orgUsers.title")}</h1>

      {organization && (
        <div className="organization-grid">
          <div className="organization-info-card">
            {isEditingOrg ? (
              <form onSubmit={handleSaveOrg} className="org-edit-form">
                <input
                  type="text"
                  dir={i18n.dir()}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="org-edit-input"
                  placeholder={t("orgUsers.orgNamePlaceholder")}
                />
                <textarea
                  dir={i18n.dir()}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="org-edit-input"
                  placeholder={t("orgUsers.orgDescriptionPlaceholder")}
                  rows={3}
                />
                <p><strong>{t("orgUsers.status")}</strong> {organization.isActive ? t("orgUsers.active") : t("orgUsers.inactive")}</p>
                <div className="org-edit-actions">
                  <button type="submit" disabled={isSavingOrg} className="topup-button">
                    {isSavingOrg ? t("orgUsers.savingButton") : t("orgUsers.saveButton")}
                  </button>
                  <button
                    type="button"
                    className="retry-button"
                    disabled={isSavingOrg}
                    onClick={() => setIsEditingOrg(false)}
                  >
                    {t("orgUsers.cancelButton")}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="org-info-header">
                  <h2>{organization.name}</h2>
                  <button className="org-edit-button" onClick={startEditingOrg}>
                    {t("orgUsers.editButton")}
                  </button>
                </div>
                <p>{organization.description || t("orgUsers.noDescription")}</p>
                <p><strong>{t("orgUsers.status")}</strong> {organization.isActive ? t("orgUsers.active") : t("orgUsers.inactive")}</p>
              </>
            )}
          </div>

          <div className="wallet-card">
            <h3 className="wallet-title">{t("orgUsers.walletTitle")}</h3>
            <p className="wallet-balance">
              {t("orgUsers.walletBalanceLabel")} <strong className="wallet-balance-amount">${organization.walletBalance ?? 0}</strong>
            </p>

            <div className="simulation-warning">
              ⚠️ <strong>{t("orgUsers.simulationWarningLabel")}</strong> {t("orgUsers.simulationWarningText")}
            </div>

            <form onSubmit={handleTopUp} className="topup-form">
              <input
                type="number"
                min="1"
                dir="ltr"
                placeholder={t("orgUsers.amountPlaceholder")}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                required
                className="topup-input"
              />
              <button type="submit" disabled={isSubmitting} className="topup-button">
                {isSubmitting ? t("orgUsers.processingButton") : t("orgUsers.topUpButton")}
              </button>
            </form>
          </div>
        </div>
      )}

      <h3>{t("orgUsers.addMemberTitle")}</h3>
      <form onSubmit={handleAddMember} className="org-edit-form">
        <input
          type="text"
          dir={i18n.dir()}
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          placeholder={t("orgUsers.fullNamePlaceholder")}
          className="org-edit-input"
        />
        <input
          type="email"
          dir="ltr"
          value={memberEmail}
          onChange={(e) => setMemberEmail(e.target.value)}
          placeholder={t("orgUsers.emailPlaceholder")}
          className="org-edit-input"
        />
        {addMemberError && <p className="error-text">{addMemberError}</p>}
        <button type="submit" disabled={addingMember} className="topup-button">
          {addingMember ? t("orgUsers.addingButton") : t("orgUsers.addMemberButton")}
        </button>
      </form>

      {createdMembers.length > 0 && (
        <div className="organization-info-card">
          <p>{t("orgUsers.createdMembersMessage", { count: createdMembers.length })}</p>
          <div className="simulation-warning">{t("orgUsers.tempPasswordWarning")}</div>
          <table className="organization-table">
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
          <button type="button" className="topup-button" onClick={handleDownloadExcel}>
            {t("orgUsers.downloadExcelButton")}
          </button>
          <button type="button" className="retry-button" onClick={() => setCreatedMembers([])}>
            {t("orgUsers.dismissCreatedMembersButton")}
          </button>
        </div>
      )}

      <h3>{t("orgUsers.usersInOrg")} ({users.length})</h3>

      {users.length === 0 ? (
        <p>{t("orgUsers.noUsers")}</p>
      ) : (
        <table className="organization-table">
          <thead>
            <tr>
              <th>{t("orgUsers.tableHeaders.email")}</th>
              <th>{t("orgUsers.tableHeaders.name")}</th>
              <th>{t("orgUsers.tableHeaders.role")}</th>
              <th>{t("orgUsers.tableHeaders.status")}</th>
              <th>{t("orgUsers.tableHeaders.joinStatus")}</th>
              <th>{t("orgUsers.tableHeaders.joinedDate")}</th>
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
                    backgroundColor: user.role === "org_owner" ? "var(--color-success)" : "var(--color-info)",
                    color: "var(--text-inverse)",
                    fontSize: "12px"
                  }}>
                    {user.role === "org_owner" ? t("orgUsers.roleOrgOwner") : user.role === "admin" ? t("orgUsers.roleAdmin") : t("orgUsers.roleUser")}
                  </span>
                </td>
                <td className="status-cell">
                  <span className="status-pill" style={{
                    backgroundColor: user.isActive ? "var(--color-success)" : "var(--color-danger)"
                  }}>
                    {user.isActive ? `✓ ${t("orgUsers.active")}` : `✕ ${t("orgUsers.inactive")}`}
                  </span>
                </td>
                <td className="status-cell">
                  <span className="status-pill" style={{
                    backgroundColor: user.lastLogin ? "var(--color-success)" : "var(--color-danger)"
                  }}>
                    {user.lastLogin ? `✓ ${t("orgUsers.joinedLabel")}` : `⏳ ${t("orgUsers.pendingFirstLoginLabel")}`}
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
