import Sparkline from "./Sparkline";

interface StatTileProps {
  label: string;
  value: number | null;
  loading: boolean;
  failed: boolean;
  trend?: number[];
}

// Plain numeric display — no count-up animation. That's reserved for the
// public landing page's stats banner (SCRUM-227); inside an authenticated
// dashboard the number should just be there when the data arrives.
export default function StatTile({ label, value, loading, failed, trend }: StatTileProps) {
  return (
    <div className="dash-stat-tile">
      <div className="dash-stat-value">
        {loading ? "…" : failed || value === null ? "—" : value.toLocaleString("he-IL")}
      </div>
      <div className="dash-stat-label">{label}</div>
      {!loading && !failed && trend && <Sparkline values={trend} />}
    </div>
  );
}
