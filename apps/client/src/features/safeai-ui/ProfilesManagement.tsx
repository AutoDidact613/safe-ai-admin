import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { API_ENDPOINTS, apiCall } from "../../config/api";
import ProfileTester from "./ProfileTester";
import ArrayInput from "./ArrayInput";


export interface Profile {
  _id: string;
  name: string;
  allowedCategories?: string[];
  blockedCategories?: string[];
  thresholdAllowed: number;
  thresholdBlocked: number;
  similarityMargin: number;
  createdBy: string;
  creatorEmail: string;
  contentPrompts?: string[];
  behaviorPrompts?: string[];
  knowledgePrompts?: string[];
  approvalStatus: "pending" | "approved" | "rejected";
  visibility: "public" | "internal";
  createdAt?: string;
}

const EMPTY_FORM: Partial<Profile> = {
  name: "",
  allowedCategories: [],
  blockedCategories: [],
  thresholdAllowed: 0.25,
  thresholdBlocked: 0.25,
  similarityMargin: 0.05,
  createdBy: "Admin",
  creatorEmail: "admin@safeai.com",
  contentPrompts: [],
  behaviorPrompts: [],
  knowledgePrompts: [],
  approvalStatus: "pending",
  visibility: "public",
};

export default function ProfilesManagement() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<Partial<Profile>>(EMPTY_FORM);

  useEffect(() => { fetchProfiles(); }, []);

  async function fetchProfiles() {
    try {
      const data = await apiCall<Profile[]>(`${API_ENDPOINTS.profiles}/admin/full`);
      setProfiles(data);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
      alert(t("profilesManagement.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await apiCall(API_ENDPOINTS.profiles, {
        method: "POST",
        body: JSON.stringify(formData),
      });

      await fetchProfiles();
      setShowCreateModal(false);
      resetForm();
      alert(t("profilesManagement.createdSuccess"));
    } catch (error: unknown) {
      console.error("Error creating profile:", error);
      const errorMessage = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("profilesManagement.createErrorPrefix", { message: errorMessage }));
    } finally {
      setSaving(false);
    }
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;

    setSaving(true);

    try {
      await apiCall(`${API_ENDPOINTS.profiles}/${editingProfile._id}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });

      await fetchProfiles();
      setShowEditModal(false);
      setEditingProfile(null);
      resetForm();
      alert(t("profilesManagement.updatedSuccess"));
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      const errorMessage = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("profilesManagement.updateErrorPrefix", { message: errorMessage }));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!confirm(t("profilesManagement.deleteConfirm", { name }))) return;

    try {
      await apiCall(`${API_ENDPOINTS.profiles}/${id}`, {
        method: "DELETE",
      });

      await fetchProfiles();
      alert(t("profilesManagement.deletedSuccess"));
    } catch (error: unknown) {
      console.error("Error deleting profile:", error);
      const errorMessage = error instanceof Error ? error.message : t("usersManagement.errorUnknown");
      alert(t("profilesManagement.deleteErrorPrefix", { message: errorMessage }));
    }
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      allowedCategories: profile.allowedCategories || [],
      blockedCategories: profile.blockedCategories || [],
      thresholdAllowed: profile.thresholdAllowed,
      thresholdBlocked: profile.thresholdBlocked,
      similarityMargin: profile.similarityMargin,
      createdBy: profile.createdBy,
      creatorEmail: profile.creatorEmail,
      contentPrompts: profile.contentPrompts || [],
      behaviorPrompts: profile.behaviorPrompts || [],
      knowledgePrompts: profile.knowledgePrompts || [],
      approvalStatus: profile.approvalStatus,
      visibility: profile.visibility,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      allowedCategories: [],
      blockedCategories: [],
      thresholdAllowed: 0.25,
      thresholdBlocked: 0.25,
      similarityMargin: 0.05,
      createdBy: "Admin",
      creatorEmail: "admin@safeai.com",
      contentPrompts: [],
      behaviorPrompts: [],
      knowledgePrompts: [],
      approvalStatus: 'pending',
      visibility: 'public',
    });
  };


  const filteredProfiles = profiles.filter((profile) =>
    profile.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="loading-state">{t("profilesManagement.loadingProfiles")}</div>;
  }

  return (
    <div>
      <div className="management-header">
        <h2>{t("safeaiNav.manageProfiles")}</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + {t("profilesManagement.newProfileButton")}
        </button>
      </div>

      {profiles.length > 0 && <ProfileTester profiles={profiles} />}

      <div className="search-bar">
        <input
          type="text"
          placeholder={t("profilesManagement.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredProfiles.length === 0 ? (
        <div className="empty-state">
          <p>{t("profilesManagement.noProfilesFound")}</p>
          {profiles.length === 0 && (
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              {t("profilesManagement.createFirstProfileButton")}
            </button>
          )}
        </div>
      ) : (
        <div className="items-grid">
          {filteredProfiles.map((profile) => (
            <div key={profile._id} className="item-card">
              <div className="item-card-header">
                <h3 className="item-card-title">{profile.name}</h3>
              </div>
              <div className="item-card-body">
                <div className="item-detail">
                  <span className="item-detail-label">{t("profileModal.labelCreatedBy")}</span>
                  <span className="item-detail-value">{profile.createdBy}</span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">{t("profileModal.labelEmail")}</span>
                  <span className="item-detail-value">{profile.creatorEmail}</span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">{t("profilesManagement.approvalStatusLabel")}</span>
                  <span className={`badge ${
                    profile.approvalStatus === 'approved' ? 'badge-success' :
                    profile.approvalStatus === 'rejected' ? 'badge-danger' :
                    'badge-warning'
                  }`}>
                    {profile.approvalStatus === 'approved' ? `✅ ${t("profilesManagement.approvedBadge")}` :
                     profile.approvalStatus === 'rejected' ? `❌ ${t("profilesManagement.rejectedBadge")}` :
                     `⏳ ${t("profilesManagement.pendingBadge")}`}
                  </span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">{t("profilesManagement.visibilityLabel")}</span>
                  <span className={`badge ${profile.visibility === 'public' ? 'badge-info' : 'badge-secondary'}`}>
                    {profile.visibility === 'public' ? `🌐 ${t("profilesManagement.publicBadge")}` : `🔒 ${t("profilesManagement.internalBadge")}`}
                  </span>
                </div>
                {profile.allowedCategories && profile.allowedCategories.length > 0 && (
                  <div className="item-detail">
                    <span className="item-detail-label">{t("profilesManagement.allowedCategoriesLabel")}</span>
                    <span className="item-detail-value">
                      {profile.allowedCategories.length}
                    </span>
                  </div>
                )}
                {profile.blockedCategories && profile.blockedCategories.length > 0 && (
                  <div className="item-detail">
                    <span className="item-detail-label">{t("profilesManagement.blockedCategoriesLabel")}</span>
                    <span className="item-detail-value">
                      {profile.blockedCategories.length}
                    </span>
                  </div>
                )}
                <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "5px" }}>
                  <strong style={{ display: "block", marginBottom: "5px" }}>📝 Prompts:</strong>
                  {profile.contentPrompts && profile.contentPrompts.length > 0 && (
                    <div style={{ marginBottom: "5px", fontSize: "13px" }}>
                      <strong>Content:</strong> {profile.contentPrompts.length} prompt(s)
                      <div style={{ marginTop: "3px", paddingRight: "10px", fontSize: "12px", color: "#666" }}>
                        {profile.contentPrompts.map((prompt, idx) => (
                          <div key={idx} style={{ marginBottom: "2px" }}>• {prompt.substring(0, 50)}{prompt.length > 50 ? '...' : ''}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.behaviorPrompts && profile.behaviorPrompts.length > 0 && (
                    <div style={{ marginBottom: "5px", fontSize: "13px" }}>
                      <strong>Behavior:</strong> {profile.behaviorPrompts.length} prompt(s)
                      <div style={{ marginTop: "3px", paddingRight: "10px", fontSize: "12px", color: "#666" }}>
                        {profile.behaviorPrompts.map((prompt, idx) => (
                          <div key={idx} style={{ marginBottom: "2px" }}>• {prompt.substring(0, 50)}{prompt.length > 50 ? '...' : ''}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.knowledgePrompts && profile.knowledgePrompts.length > 0 && (
                    <div style={{ fontSize: "13px" }}>
                      <strong>Knowledge:</strong> {profile.knowledgePrompts.length} prompt(s)
                      <div style={{ marginTop: "3px", paddingRight: "10px", fontSize: "12px", color: "#666" }}>
                        {profile.knowledgePrompts.map((prompt, idx) => (
                          <div key={idx} style={{ marginBottom: "2px" }}>• {prompt.substring(0, 50)}{prompt.length > 50 ? '...' : ''}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!profile.contentPrompts || profile.contentPrompts.length === 0) &&
                   (!profile.behaviorPrompts || profile.behaviorPrompts.length === 0) &&
                   (!profile.knowledgePrompts || profile.knowledgePrompts.length === 0) && (
                    <div style={{ fontSize: "12px", color: "#999" }}>{t("profilesManagement.noPromptsDefined")}</div>
                  )}
                </div>
              </div>
              <div className="item-card-footer" style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => openEditModal(profile)}
                  style={{ flex: 1 }}
                >
                  {t("common.edit")}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteProfile(profile._id, profile.name)}
                  style={{ flex: 1 }}
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Profile Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h2>{t("profilesManagement.newProfileButton")}</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProfile}>
              <div className="form-group">
                <label>{t("profilesManagement.profileNameLabel")}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t("profilesManagement.profileNamePlaceholder")}
                />
              </div>

              <div className="form-group">
                <label>{t("profilesManagement.createdByRequiredLabel")}</label>
                <input
                  type="text"
                  value={formData.createdBy}
                  onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t("profilesManagement.creatorEmailRequiredLabel")}</label>
                <input
                  type="email"
                  value={formData.creatorEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, creatorEmail: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>{t("profilesManagement.approvalStatusRequiredLabel")}</label>
                <select
                  value={formData.approvalStatus}
                  onChange={(e) => setFormData({ ...formData, approvalStatus: e.target.value as 'pending' | 'approved' | 'rejected' })}
                  required
                >
                  <option value="pending">⏳ {t("profilesManagement.pendingBadge")}</option>
                  <option value="approved">✅ {t("profilesManagement.approvedBadge")}</option>
                  <option value="rejected">❌ {t("profilesManagement.rejectedBadge")}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t("profilesManagement.visibilityRequiredLabel")}</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'public' | 'internal' })}
                  required
                >
                  <option value="public">🌐 {t("profilesManagement.publicBadge")}</option>
                  <option value="internal">🔒 {t("profilesManagement.internalBadge")}</option>
                </select>
              </div>

              <hr style={{ margin: "20px 0" }} />

              <ArrayInput
                label={t("profilesManagement.allowedCategoriesInputLabel")}
                items={formData.allowedCategories || []}
                placeholder={t("profilesManagement.allowedCategoryPlaceholder")}
                onAdd={(value) => setFormData({ ...formData, allowedCategories: [...(formData.allowedCategories || []), value] })}
                onRemove={(index) => setFormData({ ...formData, allowedCategories: (formData.allowedCategories || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.allowedCategories || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, allowedCategories: newArray });
                }}
              />

              <ArrayInput
                label={t("profilesManagement.blockedCategoriesInputLabel")}
                items={formData.blockedCategories || []}
                placeholder={t("profilesManagement.blockedCategoryPlaceholder")}
                onAdd={(value) => setFormData({ ...formData, blockedCategories: [...(formData.blockedCategories || []), value] })}
                onRemove={(index) => setFormData({ ...formData, blockedCategories: (formData.blockedCategories || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.blockedCategories || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, blockedCategories: newArray });
                }}
              />

              <ArrayInput
                label="Content Prompts"
                items={formData.contentPrompts || []}
                placeholder={t("profilesManagement.contentPromptsPlaceholder")}
                onAdd={(value) => setFormData({ ...formData, contentPrompts: [...(formData.contentPrompts || []), value] })}
                onRemove={(index) => setFormData({ ...formData, contentPrompts: (formData.contentPrompts || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.contentPrompts || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, contentPrompts: newArray });
                }}
              />

              <ArrayInput
                label="Behavior Prompts"
                items={formData.behaviorPrompts || []}
                placeholder={t("profilesManagement.behaviorPromptsPlaceholder")}
                onAdd={(value) => setFormData({ ...formData, behaviorPrompts: [...(formData.behaviorPrompts || []), value] })}
                onRemove={(index) => setFormData({ ...formData, behaviorPrompts: (formData.behaviorPrompts || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.behaviorPrompts || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, behaviorPrompts: newArray });
                }}
              />

              <ArrayInput
                label="Knowledge Prompts"
                items={formData.knowledgePrompts || []}
                placeholder={t("profilesManagement.knowledgePromptsPlaceholder")}
                onAdd={(value) => setFormData({ ...formData, knowledgePrompts: [...(formData.knowledgePrompts || []), value] })}
                onRemove={(index) => setFormData({ ...formData, knowledgePrompts: (formData.knowledgePrompts || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.knowledgePrompts || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, knowledgePrompts: newArray });
                }}
              />

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={saving}
                >
                  {t("common.cancel")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t("usersManagement.creatingButton") : t("profilesManagement.createProfileButton")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && editingProfile && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h2>{t("profilesManagement.editProfileTitle", { name: editingProfile.name })}</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleEditProfile}>
              <div className="form-group">
                <label>{t("profilesManagement.profileNameLabel")}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t("profilesManagement.profileNamePlaceholder")}
                />
              </div>

              <div className="form-group">
                <label>{t("profilesManagement.createdByRequiredLabel")}</label>
                <input
                  type="text"
                  value={formData.createdBy}
                  onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>{t("profilesManagement.creatorEmailRequiredLabel")}</label>
                <input
                  type="email"
                  value={formData.creatorEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, creatorEmail: e.target.value })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>{t("profilesManagement.approvalStatusRequiredLabel")}</label>
                <select
                  value={formData.approvalStatus}
                  onChange={(e) => setFormData({ ...formData, approvalStatus: e.target.value as 'pending' | 'approved' | 'rejected' })}
                  required
                >
                  <option value="pending">⏳ {t("profilesManagement.pendingBadge")}</option>
                  <option value="approved">✅ {t("profilesManagement.approvedBadge")}</option>
                  <option value="rejected">❌ {t("profilesManagement.rejectedBadge")}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t("profilesManagement.visibilityRequiredLabel")}</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'public' | 'internal' })}
                  required
                >
                  <option value="public">🌐 {t("profilesManagement.publicBadge")}</option>
                  <option value="internal">🔒 {t("profilesManagement.internalBadge")}</option>
                </select>
              </div>

              <hr style={{ margin: "20px 0" }} />

              <ArrayInput
                label={t("profilesManagement.allowedCategoriesInputLabel")}
                items={formData.allowedCategories || []}
                placeholder={t("profilesManagement.allowedCategoryPlaceholder")}
                onAdd={(value) => setFormData({ ...formData, allowedCategories: [...(formData.allowedCategories || []), value] })}
                onRemove={(index) => setFormData({ ...formData, allowedCategories: (formData.allowedCategories || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.allowedCategories || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, allowedCategories: newArray });
                }}
              />

              <ArrayInput
                label={t("profilesManagement.blockedCategoriesInputLabel")}
                items={formData.blockedCategories || []}
                placeholder={t("profilesManagement.blockedCategoryPlaceholder")}
                onAdd={(value) => setFormData({ ...formData, blockedCategories: [...(formData.blockedCategories || []), value] })}
                onRemove={(index) => setFormData({ ...formData, blockedCategories: (formData.blockedCategories || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.blockedCategories || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, blockedCategories: newArray });
                }}
              />

              <ArrayInput
                label="Content Prompts"
                items={formData.contentPrompts || []}
                placeholder={t("profilesManagement.contentPromptsPlaceholder")}
                onAdd={(value) => setFormData({ ...formData, contentPrompts: [...(formData.contentPrompts || []), value] })}
                onRemove={(index) => setFormData({ ...formData, contentPrompts: (formData.contentPrompts || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.contentPrompts || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, contentPrompts: newArray });
                }}
              />

              <ArrayInput
                label="Behavior Prompts"
                items={formData.behaviorPrompts || []}
                placeholder={t("profilesManagement.behaviorPromptsPlaceholder")}
                onAdd={(value) => setFormData({ ...formData, behaviorPrompts: [...(formData.behaviorPrompts || []), value] })}
                onRemove={(index) => setFormData({ ...formData, behaviorPrompts: (formData.behaviorPrompts || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.behaviorPrompts || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, behaviorPrompts: newArray });
                }}
              />

              <ArrayInput
                label="Knowledge Prompts"
                items={formData.knowledgePrompts || []}
                placeholder={t("profilesManagement.knowledgePromptsPlaceholder")}
                onAdd={(value) => setFormData({ ...formData, knowledgePrompts: [...(formData.knowledgePrompts || []), value] })}
                onRemove={(index) => setFormData({ ...formData, knowledgePrompts: (formData.knowledgePrompts || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.knowledgePrompts || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, knowledgePrompts: newArray });
                }}
              />

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
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
    </div>
  );
}
