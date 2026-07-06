import type { Profile } from "./ProfilesManagement";
import ArrayInput from "./ArrayInput";

interface Props {
  formData: Partial<Profile>;
  setFormData: (data: Partial<Profile>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  title: string;
  submitLabel: string;
}

export default function ProfileForm({ formData, setFormData, onSubmit, onCancel, saving, title, submitLabel }: Props) {
  const update = (patch: Partial<Profile>) => setFormData({ ...formData, ...patch });

  const updateArray = (field: keyof Profile, index: number, value: string) => {
    const arr = [...((formData[field] as string[]) ?? [])];
    arr[index] = value;
    update({ [field]: arr });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>שם הפרופיל *</label>
            <input type="text" value={formData.name ?? ""} onChange={(e) => update({ name: e.target.value })} required placeholder="למשל: פרופיל בסיסי" />
          </div>

          <div className="form-group">
            <label>נוצר על ידי *</label>
            <input type="text" value={formData.createdBy ?? ""} onChange={(e) => update({ createdBy: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>אימייל יוצר *</label>
            <input type="email" value={formData.creatorEmail ?? ""} onChange={(e) => update({ creatorEmail: e.target.value })} required />
          </div>

          <div className="form-group">
            <label>סטטוס אישור *</label>
            <select value={formData.approvalStatus} onChange={(e) => update({ approvalStatus: e.target.value as Profile["approvalStatus"] })} required>
              <option value="pending">⏳ ממתין לאישור</option>
              <option value="approved">✅ מאושר</option>
              <option value="rejected">❌ נדחה</option>
            </select>
          </div>

          <div className="form-group">
            <label>נראות *</label>
            <select value={formData.visibility} onChange={(e) => update({ visibility: e.target.value as Profile["visibility"] })} required>
              <option value="public">🌐 ציבורי</option>
              <option value="internal">🔒 פנימי</option>
            </select>
          </div>

          <hr style={{ margin: "20px 0" }} />

          {(["allowedCategories", "blockedCategories"] as const).map((field) => (
            <ArrayInput
              key={field}
              label={field === "allowedCategories" ? "קטגוריות מותרות" : "קטגוריות חסומות"}
              items={(formData[field] as string[]) ?? []}
              placeholder={field === "allowedCategories" ? "הוסף קטגוריה מותרת" : "הוסף קטגוריה חסומה"}
              onAdd={(v) => update({ [field]: [...((formData[field] as string[]) ?? []), v] })}
              onRemove={(i) => update({ [field]: ((formData[field] as string[]) ?? []).filter((_, idx) => idx !== i) })}
              onUpdate={(i, v) => updateArray(field, i, v)}
            />
          ))}

          {(["contentPrompts", "behaviorPrompts", "knowledgePrompts"] as const).map((field) => (
            <ArrayInput
              key={field}
              label={field === "contentPrompts" ? "Content Prompts" : field === "behaviorPrompts" ? "Behavior Prompts" : "Knowledge Prompts"}
              items={(formData[field] as string[]) ?? []}
              placeholder={`הוסף ${field === "contentPrompts" ? "Content" : field === "behaviorPrompts" ? "Behavior" : "Knowledge"} Prompt`}
              onAdd={(v) => update({ [field]: [...((formData[field] as string[]) ?? []), v] })}
              onRemove={(i) => update({ [field]: ((formData[field] as string[]) ?? []).filter((_, idx) => idx !== i) })}
              onUpdate={(i, v) => updateArray(field, i, v)}
            />
          ))}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>ביטול</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "שומר..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
