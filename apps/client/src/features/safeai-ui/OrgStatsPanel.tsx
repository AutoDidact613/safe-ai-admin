import type { OrganizationStats } from "./UsersManagement";

interface Props {
  stats: OrganizationStats;
  orgName: string;
  orgDescription: string;
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ backgroundColor: "white", padding: "15px", borderRadius: "6px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
      <div style={{ fontSize: "14px", color: "#6c757d", marginBottom: "5px" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

export default function OrgStatsPanel({ stats, orgName, orgDescription }: Props) {
  return (
    <div style={{ backgroundColor: "#f8f9fa", border: "1px solid #dee2e6", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
      <h3 style={{ marginTop: 0, marginBottom: "15px", color: "#495057" }}>
        📊 סטטיסטיקות ארגון: {orgName}
      </h3>
      <p>{orgDescription}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
        <StatBox label='סה"כ משתמשים' value={String(stats.totalUsers)} color="#007bff" />
        <StatBox label="משתמשים פעילים" value={String(stats.activeUsers)} color="#28a745" />
        <StatBox label='סה"כ עלות חודשית' value={`$${stats.totalCost.toFixed(2)}`} color="#dc3545" />
        <StatBox label="ממוצע למשתמש" value={`$${stats.averageCostPerUser.toFixed(2)}`} color="#ffc107" />
      </div>
    </div>
  );
}
