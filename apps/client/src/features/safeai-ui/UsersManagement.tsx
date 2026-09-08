import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS, apiCall } from "../../config/api";
import ProviderKeysManagement from "./ProviderKeysManagement";
import UserCard from "./UserCard";
import UserFilters from "./UserFilters";
import OrgStatsPanel from "./OrgStatsPanel";
import NewApiKeyModal from "./NewApiKeyModal";

export interface User {
  _id: string;
  email: string;
  name?: string;
  profileId?: string;
  organizationId?: string;
  mode: "BYOK" | "MANAGED";
  isActive: boolean;
  canCreatePosts: boolean;
  canComment: boolean;
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
const EMPTY_EDIT = { name: "", profileId: "", organizationId: "", mode: "MANAGED" as "BYOK" | "MANAGED", isActive: true, canCreatePosts: true, canComment: true };

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
      setUsers(await apiCall<User[]>(API_ENDPOINTS.users));
    } catch (err) {
      console.error("Failed to fetch users:", err);
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
    } catch (err) {
      alert(t("usersManagement.createUserErrorPrefix", { message: err instanceof Error ? err.message : t("usersManagement.errorUnknown") }));
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
          canCreatePosts: editFormData.canCreatePosts,
          canComment: editFormData.canComment,
        }),
      });
      setModal(null);
      setEditingUser(null);
      await fetchUsers();
      alert(t("usersManagement.userUpdatedSuccess"));
    } catch (err) {
      alert(t("usersManagement.updateUserErrorPrefix", { message: err instanceof Error ? err.message : t("usersManagement.errorUnknown") }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(t("usersManagement.deleteConfirm", { email }))) return;
    try {
      await apiCall(`${API_ENDPOINTS.users}/${id}`, { method: "DELETE" });
      await fetchUsers();
      alert(t("usersManagement.userDeletedSuccess"));
    } catch (err) {
      alert(t("usersManagement.deleteUserErrorPrefix", { message: err instanceof Error ? err.message : t("usersManagement.errorUnknown") }));
    }
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditFormData({ name: user.name ?? "", profileId: user.profileId ?? "", organizationId: user.organizationId ?? "", mode: user.mode, isActive: user.isActive, canCreatePosts: user.canCreatePosts, canComment: user.canComment });
    setModal("edit");
  };

  const getProfileName = (id?: string) => id ? (profiles.find(p => p._id === id)?.name ?? t("usersManagement.profileNotFound")) : t("usersManagement.noProfile");
  const getOrgName = (id?: string) => id ? (organizations.find(o => o._id === id)?.name ?? t("usersManagement.organizationNotFound")) : t("usersManagement.noOrganization");
  const getOrgDescription = (id?: string) => id ? (organizations.find(o => o._id === id)?.description ?? "") : "";

  const filteredUsers = useMemo(() => users.filter((u) => {
    const matchSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) || (u.name ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || (filterStatus === "active" ? u.isActive : !u.isActive);
    const matchMode = filterMode === "all" || u.mode === filterMode;
    const matchProfile = filterProfile === "all" || (filterProfile === "none" ? !u.profileId : u.profileId === filterProfile);
    const matchOrg = filterOrganization === "all" || (filterOrganization === "none" ? !u.organizationId : u.organizationId === filterOrganization);
    return matchSearch && matchStatus && matchMode && matchProfile && matchOrg;
  }), [users, searchTerm, filterStatus, filterMode, filterProfile, filterOrganization]);

  if (loading) return <div className="loading-state">{t("usersManagement.loadingUsers")}</div>;

  return (
    <div>
      <div className="management-header">
        <h2>{t("safeaiNav.manageUsers")}</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="badge badge-info">{t("usersManagement.totalUsersCount", { count: users.length })}</div>
          <button className="btn btn-primary" onClick={() => setModal("create")}>+ {t("usersManagement.newUserTitle")}</button>
        </div>
      </div>

      <div className="search-bar">
        <input type="text" placeholder={t("usersManagement.searchPlaceholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <UserFilters
        filterStatus={filterStatus} filterMode={filterMode} filterProfile={filterProfile} filterOrganization={filterOrganization}
        profiles={profiles} organizations={organizations}
        onStatusChange={setFilterStatus} onModeChange={setFilterMode} onProfileChange={setFilterProfile} onOrganizationChange={setFilterOrganization}
      />

      {organizationStats && filterOrganization !== "all" && filterOrganization !== "none" && (
        <OrgStatsPanel stats={organizationStats} orgName={getOrgName(filterOrganization)} orgDescription={getOrgDescription(filterOrganization)} />
      )}

      {filteredUsers.length === 0 ? (
        <div className="empty-state">
          <p>{t("usersManagement.noUsersFound")}</p>
          {users.length === 0 && <button className="btn btn-primary" onClick={() => setModal("create")}>{t("usersManagement.createFirstUserButton")}</button>}
        </div>
      ) : (
        <div className="items-grid">
          {filteredUsers.map((user) => (
            <UserCard key={user._id} user={user} profileName={getProfileName(user.profileId)} organizationName={getOrgName(user.organizationId)} onEdit={openEdit} onDelete={handleDelete} onManageKeys={setManagingKeysUser} />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {modal === "create" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("usersManagement.newUserTitle")}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group"><label>{t("register.emailLabel")}</label>
                <input type="email" value={createFormData.email} onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })} required placeholder="user@example.com" />
              </div>
              <div className="form-group"><label>{t("usersManagement.nameOptionalLabel")}</label>
                <input type="text" value={createFormData.name} onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })} placeholder={t("usersManagement.userNamePlaceholder")} />
              </div>
              <div className="form-group"><label>{t("usersManagement.profileOptionalLabel")}</label>
                <select value={createFormData.profileId} onChange={(e) => setCreateFormData({ ...createFormData, profileId: e.target.value })}>
                  <option value="">{t("usersManagement.noProfile")}</option>
                  {profiles.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>{t("usersManagement.modeRequiredLabel")}</label>
                <select value={createFormData.mode} onChange={(e) => setCreateFormData({ ...createFormData, mode: e.target.value as "BYOK" | "MANAGED" })} required>
                  <option value="MANAGED">MANAGED</option>
                  <option value="BYOK">BYOK</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input type="checkbox" checked={createFormData.isActive} onChange={(e) => setCreateFormData({ ...createFormData, isActive: e.target.checked })} />
                  {t("usersManagement.activeUserCheckbox")}
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>{t("common.cancel")}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("usersManagement.creatingButton") : t("usersManagement.createUserButton")}</button>
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
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="form-group"><label>{t("usersManagement.emailNoChangeLabel")}</label>
                <input type="email" value={editingUser.email} disabled style={{ backgroundColor: "var(--bg-elevated)", cursor: "not-allowed" }} />
              </div>
              <div className="form-group"><label>{t("usersManagement.nameLabel")}</label>
                <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} placeholder={t("usersManagement.userNamePlaceholder")} />
              </div>
              <div className="form-group"><label>{t("usersManagement.profileLabelNoColon")}</label>
                <select value={editFormData.profileId} onChange={(e) => setEditFormData({ ...editFormData, profileId: e.target.value })}>
                  <option value="">{t("usersManagement.noProfile")}</option>
                  {profiles.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>{t("usersManagement.organizationLabelNoColon")}</label>
                <select value={editFormData.organizationId} onChange={(e) => setEditFormData({ ...editFormData, organizationId: e.target.value })}>
                  <option value="">{t("usersManagement.noOrganization")}</option>
                  {organizations.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
                </select>
              </div>
              <div className="form-group"><label>{t("usersManagement.modeLabelNoColon")}</label>
                <select value={editFormData.mode} onChange={(e) => setEditFormData({ ...editFormData, mode: e.target.value as "BYOK" | "MANAGED" })}>
                  <option value="MANAGED">MANAGED</option>
                  <option value="BYOK">BYOK</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input type="checkbox" checked={editFormData.isActive} onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })} />
                  {t("usersManagement.activeUserCheckbox")}
                </label>
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input type="checkbox" checked={editFormData.canCreatePosts} onChange={(e) => setEditFormData({ ...editFormData, canCreatePosts: e.target.checked })} />
                  מורשה לפרסם פוסטים בפורום
                </label>
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input type="checkbox" checked={editFormData.canComment} onChange={(e) => setEditFormData({ ...editFormData, canComment: e.target.checked })} />
                  מורשה להגיב בפורום
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)} disabled={saving}>{t("common.cancel")}</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t("profileModal.buttonSaving") : t("usersManagement.saveChangesButton")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {managingKeysUser && (
        <ProviderKeysManagement userId={managingKeysUser._id} userEmail={managingKeysUser.email} onClose={() => setManagingKeysUser(null)} />
      )}

      {modal === "apikey" && (
        <NewApiKeyModal apiKey={generatedApiKey} onClose={() => { setModal(null); setGeneratedApiKey(""); }} />
      )}
    </div>
  );
}
