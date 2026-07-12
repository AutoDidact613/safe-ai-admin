import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS, apiCall } from "../../config/api";
import ProviderKeysManagement from "./ProviderKeysManagement";

export interface User {
  _id: string;
  email: string;
  name?: string;
  profileId?: string;
  organizationId?: string;
  mode: "BYOK" | "MANAGED";
  isActive: boolean;
  proxyKeyPrefix: string;
  litellmPrefix: string;
  createdAt?: string;
  updatedAt?: string;
  costLimits?: {
    monthlyBudget: number;
    currentMonthSpent: number;
    lastResetDate: string;
  };
}

export interface Profile {
  _id: string;
  name: string;
}

export interface Organization {
  _id: string;
  name: string;
  description: string;
}

export interface OrganizationStats {
  totalUsers: number;
  activeUsers: number;
  totalCost: number;
  averageCostPerUser: number;
}

interface CreateUserResponse {
  success: boolean;
  user: User;
  proxyApiKey: string;
}

const EMPTY_CREATE = { email: "", name: "", profileId: "", mode: "MANAGED" as "BYOK" | "MANAGED", isActive: true };
const EMPTY_EDIT = { name: "", profileId: "", organizationId: "", mode: "MANAGED" as "BYOK" | "MANAGED", isActive: true };

export default function UsersManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState<"create" | "edit" | "apikey" | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [managingKeysUser, setManagingKeysUser] = useState<User | null>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState("");

  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterMode, setFilterMode] = useState<"all" | "BYOK" | "MANAGED">("all");
  const [filterProfile, setFilterProfile] = useState("all");
  const [filterOrganization, setFilterOrganization] = useState("all");
  const [organizationStats, setOrganizationStats] = useState<OrganizationStats | null>(null);

  const [createFormData, setCreateFormData] = useState(EMPTY_CREATE);
  const [editFormData, setEditFormData] = useState(EMPTY_EDIT);

  const fetchUsers = async () => {
    try {
      const data = await apiCall<User[]>(API_ENDPOINTS.users);
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      alert(t("usersManagement.errorLoadingUsers"));
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try { setProfiles(await apiCall<Profile[]>(API_ENDPOINTS.profiles)); }
    catch (err) { console.error("Failed to fetch profiles:", err); }
  };

  const fetchOrganizations = async () => {
    try { setOrganizations(await apiCall<Organization[]>(API_ENDPOINTS.organizations)); }
    catch (err) { console.error("Failed to fetch organizations:", err); }
  };

  const calculateOrganizationStats = useCallback((orgId: string) => {
    const orgUsers = users.filter(u => u.organizationId === orgId);
    const totalCost = orgUsers.reduce((sum, u) => sum + (u.costLimits?.currentMonthSpent ?? 0), 0);
    setOrganizationStats({
      totalUsers: orgUsers.length,
      activeUsers: orgUsers.filter(u => u.isActive).length,
      totalCost,
      averageCostPerUser: orgUsers.length > 0 ? totalCost / orgUsers.length : 0,
    });
  }, [users]);

  useEffect(() => { fetchUsers(); fetchProfiles(); fetchOrganizations(); }, []);

  useEffect(() => {
    if (filterOrganization !== "all" && filterOrganization !== "none") {
      calculateOrganizationStats(filterOrganization);
    } else {
      setOrganizationStats(null);
    }
  }, [filterOrganization, users, calculateOrganizationStats]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiCall<CreateUserResponse>(API_ENDPOINTS.users, {
        method: "POST",
        body: JSON.stringify({
          email: createFormData.email,
          name: createFormData.name || undefined,
          profileId: createFormData.profileId || undefined,
          mode: createFormData.mode,
          isActive: createFormData.isActive,
        }),
      });
      setGeneratedApiKey(res.proxyApiKey);
      setModal("apikey");
      setCreateFormData(EMPTY_CREATE);
      await fetchUsers();
    } catch (error: unknown) {
      console.error("Error creating user:", error);
      const errorMessage = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("usersManagement.createUserErrorPrefix", { message: errorMessage }));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      await apiCall(`${API_ENDPOINTS.users}/${editingUser._id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editFormData.name || undefined,
          profileId: editFormData.profileId || undefined,
          organizationId: editFormData.organizationId || undefined,
          mode: editFormData.mode,
          isActive: editFormData.isActive,
        }),
      });
      setModal(null);
      setEditingUser(null);
      await fetchUsers();
      alert(t("usersManagement.userUpdatedSuccess"));
    } catch (error: unknown) {
      console.error("Error updating user:", error);
      const errorMessage = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("usersManagement.updateUserErrorPrefix", { message: errorMessage }));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(t("usersManagement.deleteConfirm", { email: userEmail }))) {
      return;
    }

    try {
      await apiCall(`${API_ENDPOINTS.users}/${userId}`, { method: "DELETE" });
      await fetchUsers();
      alert(t("usersManagement.userDeletedSuccess"));
    } catch (error: unknown) {
      console.error("Error deleting user:", error);
      const errorMessage = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("usersManagement.deleteUserErrorPrefix", { message: errorMessage }));
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({ name: user.name ?? "", profileId: user.profileId ?? "", organizationId: user.organizationId ?? "", mode: user.mode, isActive: user.isActive });
    setModal("edit");
  };

  const getProfileName = (profileId?: string) => {
    if (!profileId) return t("usersManagement.noProfile");
    const profile = profiles.find((p) => p._id === profileId);
    return profile ? profile.name : t("usersManagement.profileNotFound");
  };

  const getOrganizationName = (organizationId?: string) => {
    if (!organizationId) return t("usersManagement.noOrganization");
    const org = organizations.find((o) => o._id === organizationId);
    return org ? org.name : t("usersManagement.organizationNotFound");
  };
  const getOrganizationDescription = (organizationId?: string) => {
    if (!organizationId) return t("usersManagement.noOrganization");
    const org = organizations.find((o) => o._id === organizationId);
    return org ? org.description : t("usersManagement.organizationNotFound");
  };

  const filteredUsers = useMemo(() => users.filter((u) => {
    const matchSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || (u.name ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || (filterStatus === "active" ? u.isActive : !u.isActive);
    const matchMode = filterMode === "all" || u.mode === filterMode;
    const matchProfile = filterProfile === "all" || (filterProfile === "none" ? !u.profileId : u.profileId === filterProfile);
    const matchOrg = filterOrganization === "all" || (filterOrganization === "none" ? !u.organizationId : u.organizationId === filterOrganization);
    return matchSearch && matchStatus && matchMode && matchProfile && matchOrg;
  }), [users, searchTerm, filterStatus, filterMode, filterProfile, filterOrganization]);

  if (loading) {
    return <div className="loading-state">{t("usersManagement.loadingUsers")}</div>;
  }

  return (
    <div>
      <div className="management-header">
        <h2>{t("safeaiNav.manageUsers")}</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="badge badge-info">{t("usersManagement.totalUsersCount", { count: users.length })}</div>
          <button className="btn btn-primary" onClick={() => setModal("create")}>
            + {t("usersManagement.newUserTitle")}
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder={t("usersManagement.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div>
          <label style={{ marginLeft: "8px", fontWeight: "bold" }}>{t("usersManagement.statusLabel")}</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | "active" | "inactive")}
            style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ddd" }}
          >
            <option value="all">{t("common.all")}</option>
            <option value="active">{t("orgUsers.active")}</option>
            <option value="inactive">{t("orgUsers.inactive")}</option>
          </select>
        </div>

        <div>
          <label style={{ marginLeft: "8px", fontWeight: "bold" }}>{t("usersManagement.modeLabel")}</label>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as "all" | "BYOK" | "MANAGED")}
            style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ddd" }}
          >
            <option value="all">{t("common.all")}</option>
            <option value="BYOK">BYOK</option>
            <option value="MANAGED">MANAGED</option>
          </select>
        </div>

        <div>
          <label style={{ marginLeft: "8px", fontWeight: "bold" }}>{t("usersManagement.profileLabel")}</label>
          <select
            value={filterProfile}
            onChange={(e) => setFilterProfile(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ddd" }}
          >
            <option value="all">{t("common.all")}</option>
            <option value="none">{t("usersManagement.noProfile")}</option>
            {profiles.map((profile) => (
              <option key={profile._id} value={profile._id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ marginLeft: "8px", fontWeight: "bold" }}>{t("usersManagement.organizationLabel")}</label>
          <select
            value={filterOrganization}
            onChange={(e) => setFilterOrganization(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ddd" }}
          >
            <option value="all">{t("common.all")}</option>
            <option value="none">{t("usersManagement.noOrganization")}</option>
            {organizations.map((org) => (
              <option key={org._id} value={org._id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Organization Statistics */}
      {organizationStats && filterOrganization !== "all" && filterOrganization !== "none" && (
        <div style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px"
        }}>
          <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#495057" }}>
            📊 {t("usersManagement.orgStatsTitle", { name: getOrganizationName(filterOrganization) })}
          </h3>
          <p>
            {getOrganizationDescription(filterOrganization)}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
            <div style={{
              backgroundColor: "white",
              padding: "15px",
              borderRadius: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}>
              <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "5px" }}>{t("usersManagement.statTotalUsersLabel")}</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#007bff" }}>
                {organizationStats.totalUsers}
              </div>
            </div>
            <div style={{
              backgroundColor: "white",
              padding: "15px",
              borderRadius: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}>
              <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "5px" }}>{t("statistics.activeUsersLabel")}</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>
                {organizationStats.activeUsers}
              </div>
            </div>
            <div style={{
              backgroundColor: "white",
              padding: "15px",
              borderRadius: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}>
              <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "5px" }}>{t("usersManagement.statTotalMonthlyCostLabel")}</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc3545" }}>
                ${organizationStats.totalCost.toFixed(2)}
              </div>
            </div>
            <div style={{
              backgroundColor: "white",
              padding: "15px",
              borderRadius: "6px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}>
              <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "5px" }}>{t("usersManagement.statAvgPerUserLabel")}</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ffc107" }}>
                ${organizationStats.averageCostPerUser.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <p>{t("usersManagement.noUsersFound")}</p>
          {users.length === 0 && (
            <button className="btn btn-primary" onClick={() => setModal("create")}>
              {t("usersManagement.createFirstUserButton")}
            </button>
          )}
        </div>
      ) : (
        <div className="items-grid">
          {filteredUsers.map((user) => (
            <div key={user._id} className="item-card">
              <div className="item-card-header">
                <h3 className="item-card-title">{user.name || user.email}</h3>
                <div className="item-card-actions">
                  <span
                    className={
                      user.isActive ? "badge badge-success" : "badge badge-danger"
                    }
                  >
                    {user.isActive ? t("orgUsers.active") : t("orgUsers.inactive")}
                  </span>
                </div>
              </div>
              <div className="item-card-body">
                <div className="item-detail">
                  <span className="item-detail-label">{t("profileModal.labelEmail")}</span>
                  <span className="item-detail-value" dir="ltr">{user.email}</span>
                </div>
                {user.name && (
                  <div className="item-detail">
                    <span className="item-detail-label">{t("profileModal.labelName")}</span>
                    <span className="item-detail-value">{user.name}</span>
                  </div>
                )}
                <div className="item-detail">
                  <span className="item-detail-label">{t("usersManagement.profileLabel")}</span>
                  <span className="item-detail-value">
                    <span className={user.profileId ? "badge badge-info" : "badge badge-secondary"}>
                      {getProfileName(user.profileId)}
                    </span>
                  </span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">{t("usersManagement.organizationLabel")}</span>
                  <span className="item-detail-value">
                    <span className={user.organizationId ? "badge badge-info" : "badge badge-secondary"}>
                      {getOrganizationName(user.organizationId)}
                    </span>
                  </span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">{t("usersManagement.modeLabel")}</span>
                  <span className="item-detail-value">
                    <span className={user.mode === "BYOK" ? "badge badge-info" : "badge badge-warning"}>
                      {user.mode}
                    </span>
                  </span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">Proxy Key Prefix:</span>
                  <span className="item-detail-value">{user.proxyKeyPrefix}</span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">LiteLLM Prefix:</span>
                  <span className="item-detail-value">{user.litellmPrefix}</span>
                </div>
                {user.costLimits && (
                  <div className="item-detail">
                    <span className="item-detail-label">{t("usersManagement.monthlyCostLabel")}</span>
                    <span className="item-detail-value">
                      ${user.costLimits.currentMonthSpent.toFixed(2)} / ${user.costLimits.monthlyBudget.toFixed(2)}
                    </span>
                  </div>
                )}
                {user.createdAt && (
                  <div className="item-detail">
                    <span className="item-detail-label">{t("usersManagement.createdOnLabel")}</span>
                    <span className="item-detail-value">
                      {new Date(user.createdAt).toLocaleDateString("he-IL")}
                    </span>
                  </div>
                )}
              </div>
              <div className="item-card-footer" style={{ display: "flex", gap: "10px", marginTop: "15px", flexWrap: "wrap" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => openEdit(user)}
                  style={{ flex: 1, minWidth: "100px" }}
                >
                  {t("common.edit")}
                </button>
                {user.mode === "BYOK" && (
                  <button
                    className="btn btn-primary"
                    onClick={() => setManagingKeysUser(user)}
                    style={{ flex: 1, minWidth: "100px" }}
                  >
                    🔑 {t("nav.apiKeys")}
                  </button>
                )}
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteUser(user._id, user.email)}
                  style={{ flex: 1, minWidth: "100px" }}
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {modal === "create" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("usersManagement.newUserTitle")}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>{t("register.emailLabel")}</label>
                <input
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  required
                  placeholder="user@example.com"
                />
              </div>

              <div className="form-group">
                <label>{t("usersManagement.nameOptionalLabel")}</label>
                <input
                  type="text"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder={t("usersManagement.userNamePlaceholder")}
                />
              </div>

              <div className="form-group">
                <label>{t("usersManagement.profileOptionalLabel")}</label>
                <select
                  value={createFormData.profileId}
                  onChange={(e) => setCreateFormData({ ...createFormData, profileId: e.target.value })}
                >
                  <option value="">{t("usersManagement.noProfile")}</option>
                  {profiles.map((profile) => (
                    <option key={profile._id} value={profile._id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t("usersManagement.modeRequiredLabel")}</label>
                <select
                  value={createFormData.mode}
                  onChange={(e) => setCreateFormData({ ...createFormData, mode: e.target.value as "BYOK" | "MANAGED" })}
                  required
                >
                  <option value="MANAGED">MANAGED</option>
                  <option value="BYOK">BYOK</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    checked={createFormData.isActive}
                    onChange={(e) => setCreateFormData({ ...createFormData, isActive: e.target.checked })}
                  />
                  {t("usersManagement.activeUserCheckbox")}
                </label>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModal(null)}
                  disabled={saving}
                >
                  {t("common.cancel")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t("usersManagement.creatingButton") : t("usersManagement.createUserButton")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal === "edit" && editingUser && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("usersManagement.editUserTitle", { email: editingUser.email })}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                ×
              </button>
            </div>

            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label>{t("usersManagement.emailNoChangeLabel")}</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                />
              </div>

              <div className="form-group">
                <label>{t("usersManagement.nameLabel")}</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder={t("usersManagement.userNamePlaceholder")}
                />
              </div>

              <div className="form-group">
                <label>{t("usersManagement.profileLabelNoColon")}</label>
                <select
                  value={editFormData.profileId}
                  onChange={(e) => setEditFormData({ ...editFormData, profileId: e.target.value })}
                >
                  <option value="">{t("usersManagement.noProfile")}</option>
                  {profiles.map((profile) => (
                    <option key={profile._id} value={profile._id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t("usersManagement.organizationLabelNoColon")}</label>
                <select
                  value={editFormData.organizationId}
                  onChange={(e) => setEditFormData({ ...editFormData, organizationId: e.target.value })}
                >
                  <option value="">{t("usersManagement.noOrganization")}</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org._id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>{t("usersManagement.modeLabelNoColon")}</label>
                <select
                  value={editFormData.mode}
                  onChange={(e) => setEditFormData({ ...editFormData, mode: e.target.value as "BYOK" | "MANAGED" })}
                >
                  <option value="MANAGED">MANAGED</option>
                  <option value="BYOK">BYOK</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="checkbox"
                    checked={editFormData.isActive}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                  />
                  {t("usersManagement.activeUserCheckbox")}
                </label>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModal(null)}
                  disabled={saving}
                >
                  {t("common.cancel")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t("profileModal.buttonSaving") : t("usersManagement.saveChangesButton")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {managingKeysUser && (
        <ProviderKeysManagement userId={managingKeysUser._id} userEmail={managingKeysUser.email} onClose={() => setManagingKeysUser(null)} />
      )}

      {/* API Key Display Modal */}
      {modal === "apikey" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 {t("usersManagement.apiKeyCreatedTitle")}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>
                ×
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              <div style={{
                backgroundColor: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: "4px",
                padding: "15px",
                marginBottom: "20px"
              }}>
                <strong>⚠️ {t("usersManagement.importantWarningLabel")}</strong>
                <p style={{ margin: "10px 0 0 0" }}>
                  {t("usersManagement.apiKeyOneTimeWarning")}
                </p>
              </div>

              <div className="form-group">
                <label>API Key:</label>
                <textarea
                  value={generatedApiKey}
                  readOnly
                  rows={3}
                  style={{
                    width: "100%",
                    fontFamily: "monospace",
                    fontSize: "14px",
                    backgroundColor: "#f8f9fa",
                    padding: "10px"
                  }}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: "100%" }}
                onClick={() => {
                  navigator.clipboard.writeText(generatedApiKey);
                  alert(t("usersManagement.keyCopiedAlert"));
                }}
              >
                📋 {t("usersManagement.copyToClipboardButton")}
              </button>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setModal(null);
                  setGeneratedApiKey("");
                }}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
