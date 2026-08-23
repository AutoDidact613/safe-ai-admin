import { useState, useMemo } from "react";
import { API_ENDPOINTS, apiCall } from "../../config/api";
import ProfileTester from "./ProfileTester";
import ProfileCard from "./ProfileCard";
import ProfileForm from "./ProfileForm";

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
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState<Partial<Profile>>(EMPTY_FORM);

  useState(() => { fetchProfiles(); });

  async function fetchProfiles() {
    try {
      const data = await apiCall<Profile[]>(`${API_ENDPOINTS.profiles}/admin/full`);
      setProfiles(data);
    } catch (err) {
      console.error("Failed to fetch profiles:", err);
      alert("שגיאה בטעינת פרופילים");
    } finally {
      setLoading(false);
    }
  }

  const openCreate = () => { setFormData(EMPTY_FORM); setModal("create"); };
  const openEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({ ...profile });
    setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditingProfile(null); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiCall(API_ENDPOINTS.profiles, { method: "POST", body: JSON.stringify(formData) });
      await fetchProfiles();
      closeModal();
      alert("הפרופיל נוצר בהצלחה");
    } catch (err) {
      alert(`שגיאה ביצירת פרופיל: ${err instanceof Error ? err.message : "שגיאה לא ידועה"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    setSaving(true);
    try {
      await apiCall(`${API_ENDPOINTS.profiles}/${editingProfile._id}`, { method: "PUT", body: JSON.stringify(formData) });
      await fetchProfiles();
      closeModal();
      alert("הפרופיל עודכן בהצלחה");
    } catch (err) {
      alert(`שגיאה בעדכון פרופיל: ${err instanceof Error ? err.message : "שגיאה לא ידועה"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הפרופיל "${name}"?`)) return;
    try {
      await apiCall(`${API_ENDPOINTS.profiles}/${id}`, { method: "DELETE" });
      await fetchProfiles();
      alert("הפרופיל נמחק בהצלחה");
    } catch (err) {
      alert(`שגיאה במחיקת פרופיל: ${err instanceof Error ? err.message : "שגיאה לא ידועה"}`);
    }
  };

  const filteredProfiles = useMemo(
    () => profiles.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [profiles, searchTerm]
  );

  if (loading) return <div className="loading-state">טוען פרופילים...</div>;

  return (
    <div>
      <div className="management-header">
        <h2>ניהול פרופילים</h2>
        <button className="btn btn-primary" onClick={openCreate}>+ פרופיל חדש</button>
      </div>

      {profiles.length > 0 && <ProfileTester profiles={profiles} />}

      <div className="search-bar">
        <input type="text" placeholder="חפש פרופיל..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {filteredProfiles.length === 0 ? (
        <div className="empty-state">
          <p>לא נמצאו פרופילים</p>
          {profiles.length === 0 && <button className="btn btn-primary" onClick={openCreate}>צור פרופיל ראשון</button>}
        </div>
      ) : (
        <div className="items-grid">
          {filteredProfiles.map((profile) => (
            <ProfileCard key={profile._id} profile={profile} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {modal === "create" && (
        <ProfileForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreate}
          onCancel={closeModal}
          saving={saving}
          title="פרופיל חדש"
          submitLabel="צור פרופיל"
        />
      )}

      {modal === "edit" && editingProfile && (
        <ProfileForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleEdit}
          onCancel={closeModal}
          saving={saving}
          title={`עריכת פרופיל: ${editingProfile.name}`}
          submitLabel="שמור שינויים"
        />
      )}
    </div>
  );
}
