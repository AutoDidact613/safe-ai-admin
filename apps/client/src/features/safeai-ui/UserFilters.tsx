import type { Profile, Organization } from "./UsersManagement";

interface Props {
  filterStatus: "all" | "active" | "inactive";
  filterMode: "all" | "BYOK" | "MANAGED";
  filterProfile: string;
  filterOrganization: string;
  profiles: Profile[];
  organizations: Organization[];
  onStatusChange: (v: "all" | "active" | "inactive") => void;
  onModeChange: (v: "all" | "BYOK" | "MANAGED") => void;
  onProfileChange: (v: string) => void;
  onOrganizationChange: (v: string) => void;
}

const selectStyle = { padding: "5px 10px", borderRadius: "4px", border: "1px solid var(--border-default)" };
const labelStyle = { marginLeft: "8px", fontWeight: "bold" as const };

export default function UserFilters({ filterStatus, filterMode, filterProfile, filterOrganization, profiles, organizations, onStatusChange, onModeChange, onProfileChange, onOrganizationChange }: Props) {
  return (
    <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>
      <div>
        <label style={labelStyle}>סטטוס:</label>
        <select value={filterStatus} onChange={(e) => onStatusChange(e.target.value as "all" | "active" | "inactive")} style={selectStyle}>
          <option value="all">הכל</option>
          <option value="active">פעיל</option>
          <option value="inactive">לא פעיל</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>מצב:</label>
        <select value={filterMode} onChange={(e) => onModeChange(e.target.value as "all" | "BYOK" | "MANAGED")} style={selectStyle}>
          <option value="all">הכל</option>
          <option value="BYOK">BYOK</option>
          <option value="MANAGED">MANAGED</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>פרופיל:</label>
        <select value={filterProfile} onChange={(e) => onProfileChange(e.target.value)} style={selectStyle}>
          <option value="all">הכל</option>
          <option value="none">ללא פרופיל</option>
          {profiles.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>ארגון:</label>
        <select value={filterOrganization} onChange={(e) => onOrganizationChange(e.target.value)} style={selectStyle}>
          <option value="all">הכל</option>
          <option value="none">ללא ארגון</option>
          {organizations.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
        </select>
      </div>
    </div>
  );
}
