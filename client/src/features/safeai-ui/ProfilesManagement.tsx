import { useState, useEffect } from "react";
import { API_ENDPOINTS, apiCall } from "../../config/api";
import ArrayInput from "./ArrayInput";
import ProfileTester from "./ProfileTester";

interface Profile {
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
  approvalStatus: 'pending' | 'approved' | 'rejected';
  visibility: 'public' | 'internal';
  createdAt?: string;
}

export default function ProfilesManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Profile>>({
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

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      // Admin should see all profiles with full details (categories and prompts)
      const data = await apiCall<Profile[]>(`${API_ENDPOINTS.profiles}/admin/full`);
      setProfiles(data);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
      alert("שגיאה בטעינת פרופילים");
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
      alert("הפרופיל נוצר בהצלחה");
    } catch (error: unknown) {
      console.error("Error creating profile:", error);
      const errorMessage = error instanceof Error ? error.message : "שגיאה לא ידועה";
      alert(`שגיאה ביצירת פרופיל: ${errorMessage}`);
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
      alert("הפרופיל עודכן בהצלחה");
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      const errorMessage = error instanceof Error ? error.message : "שגיאה לא ידועה";
      alert(`שגיאה בעדכון פרופיל: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async (id: string, name: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הפרופיל "${name}"?`)) return;

    try {
      await apiCall(`${API_ENDPOINTS.profiles}/${id}`, {
        method: "DELETE",
      });

      await fetchProfiles();
      alert("הפרופיל נמחק בהצלחה");
    } catch (error: unknown) {
      console.error("Error deleting profile:", error);
      const errorMessage = error instanceof Error ? error.message : "שגיאה לא ידועה";
      alert(`שגיאה במחיקת פרופיל: ${errorMessage}`);
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
    return <div className="loading-state">טוען פרופילים...</div>;
  }


  return (
    <div>
      <div className="management-header">
        <h2>ניהול פרופילים</h2>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + פרופיל חדש
        </button>
      </div>

      {/* Profile Tester */}
      {profiles.length > 0 && <ProfileTester profiles={profiles} />}

      <div className="search-bar">
        <input
          type="text"
          placeholder="חפש פרופיל..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredProfiles.length === 0 ? (
        <div className="empty-state">
          <p>לא נמצאו פרופילים</p>
          {profiles.length === 0 && (
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              צור פרופיל ראשון
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
                  <span className="item-detail-label">נוצר על ידי:</span>
                  <span className="item-detail-value">{profile.createdBy}</span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">אימייל:</span>
                  <span className="item-detail-value">{profile.creatorEmail}</span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">סטטוס אישור:</span>
                  <span className={`badge ${
                    profile.approvalStatus === 'approved' ? 'badge-success' : 
                    profile.approvalStatus === 'rejected' ? 'badge-danger' : 
                    'badge-warning'
                  }`}>
                    {profile.approvalStatus === 'approved' ? '✅ מאושר' : 
                     profile.approvalStatus === 'rejected' ? '❌ נדחה' : 
                     '⏳ ממתין לאישור'}
                  </span>
                </div>
                <div className="item-detail">
                  <span className="item-detail-label">נראות:</span>
                  <span className={`badge ${profile.visibility === 'public' ? 'badge-info' : 'badge-secondary'}`}>
                    {profile.visibility === 'public' ? '🌐 ציבורי' : '🔒 פנימי'}
                  </span>
                </div>
                {profile.allowedCategories && profile.allowedCategories.length > 0 && (
                  <div className="item-detail">
                    <span className="item-detail-label">קטגוריות מותרות:</span>
                    <span className="item-detail-value">
                      {profile.allowedCategories.length}
                    </span>
                  </div>
                )}
                {profile.blockedCategories && profile.blockedCategories.length > 0 && (
                  <div className="item-detail">
                    <span className="item-detail-label">קטגוריות חסומות:</span>
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
                    <div style={{ fontSize: "12px", color: "#999" }}>אין prompts מוגדרים</div>
                  )}
                </div>
              </div>
              <div className="item-card-footer" style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => openEditModal(profile)}
                  style={{ flex: 1 }}
                >
                  ערוך
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteProfile(profile._id, profile.name)}
                  style={{ flex: 1 }}
                >
                  מחק
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
              <h2>פרופיל חדש</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProfile}>
              <div className="form-group">
                <label>שם הפרופיל *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="למשל: פרופיל בסיסי"
                />
              </div>

              <div className="form-group">
                <label>נוצר על ידי *</label>
                <input
                  type="text"
                  value={formData.createdBy}
                  onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>אימייל יוצר *</label>
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
                <label>סטטוס אישור *</label>
                <select
                  value={formData.approvalStatus}
                  onChange={(e) => setFormData({ ...formData, approvalStatus: e.target.value as 'pending' | 'approved' | 'rejected' })}
                  required
                >
                  <option value="pending">⏳ ממתין לאישור</option>
                  <option value="approved">✅ מאושר</option>
                  <option value="rejected">❌ נדחה</option>
                </select>
              </div>

              <div className="form-group">
                <label>נראות *</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'public' | 'internal' })}
                  required
                >
                  <option value="public">🌐 ציבורי</option>
                  <option value="internal">🔒 פנימי</option>
                </select>
              </div>

              <hr style={{ margin: "20px 0" }} />

              <ArrayInput
                label="קטגוריות מותרות"
                items={formData.allowedCategories || []}
                placeholder="הוסף קטגוריה מותרת"
                onAdd={(value) => setFormData({ ...formData, allowedCategories: [...(formData.allowedCategories || []), value] })}
                onRemove={(index) => setFormData({ ...formData, allowedCategories: (formData.allowedCategories || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.allowedCategories || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, allowedCategories: newArray });
                }}
              />

              <ArrayInput
                label="קטגוריות חסומות"
                items={formData.blockedCategories || []}
                placeholder="הוסף קטגוריה חסומה"
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
                placeholder="הוסף Content Prompt"
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
                placeholder="הוסף Behavior Prompt"
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
                placeholder="הוסף Knowledge Prompt"
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
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "יוצר..." : "צור פרופיל"}
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
              <h2>עריכת פרופיל: {editingProfile.name}</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleEditProfile}>
              <div className="form-group">
                <label>שם הפרופיל *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="למשל: פרופיל בסיסי"
                />
              </div>

              <div className="form-group">
                <label>נוצר על ידי *</label>
                <input
                  type="text"
                  value={formData.createdBy}
                  onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>אימייל יוצר *</label>
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
                <label>סטטוס אישור *</label>
                <select
                  value={formData.approvalStatus}
                  onChange={(e) => setFormData({ ...formData, approvalStatus: e.target.value as 'pending' | 'approved' | 'rejected' })}
                  required
                >
                  <option value="pending">⏳ ממתין לאישור</option>
                  <option value="approved">✅ מאושר</option>
                  <option value="rejected">❌ נדחה</option>
                </select>
              </div>

              <div className="form-group">
                <label>נראות *</label>
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'public' | 'internal' })}
                  required
                >
                  <option value="public">🌐 ציבורי</option>
                  <option value="internal">🔒 פנימי</option>
                </select>
              </div>

              <hr style={{ margin: "20px 0" }} />

              <ArrayInput
                label="קטגוריות מותרות"
                items={formData.allowedCategories || []}
                placeholder="הוסף קטגוריה מותרת"
                onAdd={(value) => setFormData({ ...formData, allowedCategories: [...(formData.allowedCategories || []), value] })}
                onRemove={(index) => setFormData({ ...formData, allowedCategories: (formData.allowedCategories || []).filter((_, i) => i !== index) })}
                onUpdate={(index, value) => {
                  const newArray = [...(formData.allowedCategories || [])];
                  newArray[index] = value;
                  setFormData({ ...formData, allowedCategories: newArray });
                }}
              />

              <ArrayInput
                label="קטגוריות חסומות"
                items={formData.blockedCategories || []}
                placeholder="הוסף קטגוריה חסומה"
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
                placeholder="הוסף Content Prompt"
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
                placeholder="הוסף Behavior Prompt"
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
                placeholder="הוסף Knowledge Prompt"
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
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "שומר..." : "שמור שינויים"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
