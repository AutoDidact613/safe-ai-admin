import type { Profile } from "./ProfilesManagement";

interface Props {
  profile: Profile;
  onEdit: (profile: Profile) => void;
  onDelete: (id: string, name: string) => void;
}

function PromptSection({ label, prompts }: { label: string; prompts: string[] }) {
  if (!prompts.length) return null;
  return (
    <div style={{ marginBottom: "5px", fontSize: "13px" }}>
      <strong>{label}:</strong> {prompts.length} prompt(s)
      <div style={{ marginTop: "3px", paddingRight: "10px", fontSize: "12px", color: "var(--text-muted)" }}>
        {prompts.map((p, i) => (
          <div key={i} style={{ marginBottom: "2px" }}>• {p.substring(0, 50)}{p.length > 50 ? "..." : ""}</div>
        ))}
      </div>
    </div>
  );
}

export default function ProfileCard({ profile, onEdit, onDelete }: Props) {
  const hasPrompts =
    (profile.contentPrompts?.length ?? 0) +
    (profile.behaviorPrompts?.length ?? 0) +
    (profile.knowledgePrompts?.length ?? 0) > 0;

  return (
    <div className="item-card">
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
            profile.approvalStatus === "approved" ? "badge-success" :
            profile.approvalStatus === "rejected" ? "badge-danger" : "badge-warning"
          }`}>
            {profile.approvalStatus === "approved" ? "✅ מאושר" :
             profile.approvalStatus === "rejected" ? "❌ נדחה" : "⏳ ממתין לאישור"}
          </span>
        </div>
        <div className="item-detail">
          <span className="item-detail-label">נראות:</span>
          <span className={`badge ${profile.visibility === "public" ? "badge-info" : "badge-secondary"}`}>
            {profile.visibility === "public" ? "🌐 ציבורי" : "🔒 פנימי"}
          </span>
        </div>
        {(profile.allowedCategories?.length ?? 0) > 0 && (
          <div className="item-detail">
            <span className="item-detail-label">קטגוריות מותרות:</span>
            <span className="item-detail-value">{profile.allowedCategories!.length}</span>
          </div>
        )}
        {(profile.blockedCategories?.length ?? 0) > 0 && (
          <div className="item-detail">
            <span className="item-detail-label">קטגוריות חסומות:</span>
            <span className="item-detail-value">{profile.blockedCategories!.length}</span>
          </div>
        )}
        <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "var(--bg-elevated)", borderRadius: "5px" }}>
          <strong style={{ display: "block", marginBottom: "5px" }}>📝 Prompts:</strong>
          <PromptSection label="Content" prompts={profile.contentPrompts ?? []} />
          <PromptSection label="Behavior" prompts={profile.behaviorPrompts ?? []} />
          <PromptSection label="Knowledge" prompts={profile.knowledgePrompts ?? []} />
          {!hasPrompts && <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>אין prompts מוגדרים</div>}
        </div>
      </div>
      <div className="item-card-footer" style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
        <button className="btn btn-secondary" onClick={() => onEdit(profile)} style={{ flex: 1 }}>
          ערוך
        </button>
        <button className="btn btn-danger" onClick={() => onDelete(profile._id, profile.name)} style={{ flex: 1 }}>
          מחק
        </button>
      </div>
    </div>
  );
}
