import type { OrganizationStats } from "./UsersManagement";

interface Props {
  stats: OrganizationStats;
  orgName: string;
  orgDescription: string;
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ backgroundColor: "var(--bg-surface)", padding: "15px", borderRadius: "6px", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "5px" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

export default function OrgStatsPanel({ stats, orgName, orgDescription }: Props) {
  return (
    <div style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
      <h3 style={{ marginTop: 0, marginBottom: "15px", color: "var(--text-secondary)" }}>
        📊 סטטיסטיקות ארגון: {orgName}
      </h3>
      <p>{orgDescription}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
        <StatBox label='סה"כ משתמשים' value={String(stats.totalUsers)} color="var(--color-info)" />
        <StatBox label="משתמשים פעילים" value={String(stats.activeUsers)} color="var(--color-success)" />
        <StatBox label='סה"כ עלות חודשית' value={`$${stats.totalCost.toFixed(2)}`} color="var(--color-danger)" />
        <StatBox label="ממוצע למשתמש" value={`$${stats.averageCostPerUser.toFixed(2)}`} color="var(--color-warning)" />
      </div>
    </div>
  );
}
