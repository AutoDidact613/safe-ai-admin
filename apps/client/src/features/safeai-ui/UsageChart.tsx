import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import type { UsageStats, DailyUsage, ModelUsage } from "../../hooks/useUsageData";

interface Props {
  usageStats: UsageStats;
  dailyUsage: DailyUsage[];
  modelUsage: ModelUsage[];
}

export default function UsageChart({ usageStats, dailyUsage, modelUsage }: Props) {
  return (
    <>
      <div className="card" style={{ marginTop: "24px" }}>
        <h3>סטטיסטיקות שימוש (7 ימים אחרונים)</h3>
        <div className="dashboard-grid" style={{ marginTop: "16px" }}>
          <div className="stat-card">
            <h4>סה"כ Tokens</h4>
            <p className="stat-value">{usageStats.totalTokens.toLocaleString()}</p>
            <p className="stat-change">ממוצע: {Math.round(usageStats.totalTokens / (usageStats.totalRequests || 1))} לבקשה</p>
          </div>
          <div className="stat-card">
            <h4>זמן תגובה ממוצע</h4>
            <p className="stat-value">{Math.round(usageStats.avgResponseTime)}ms</p>
          </div>
          <div className="stat-card">
            <h4>עלות כוללת</h4>
            <p className="stat-value">${usageStats.totalCost.toFixed(4)}</p>
          </div>
          <div className="stat-card">
            <h4>שיעור הצלחה</h4>
            <p className="stat-value">
              {((usageStats.successfulRequests / (usageStats.totalRequests || 1)) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {dailyUsage.length > 0 && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3>שימוש יומי</h3>
          <ResponsiveContainer width="100%" height={300} style={{ marginTop: "16px" }}>
            <LineChart data={dailyUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" tickFormatter={(v) => format(new Date(v), "dd/MM")} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip labelFormatter={(v) => format(new Date(v as string), "dd/MM/yyyy")} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="requests" stroke="#8884d8" name="בקשות" />
              <Line yAxisId="right" type="monotone" dataKey="tokens" stroke="#82ca9d" name="Tokens" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {modelUsage.length > 0 && (
        <div className="card" style={{ marginTop: "24px" }}>
          <h3>שימוש לפי מודל (30 ימים אחרונים)</h3>
          <div style={{ overflowX: "auto", marginTop: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-default)" }}>
                  <th style={{ padding: "12px", textAlign: "right" }}>מודל</th>
                  <th style={{ padding: "12px", textAlign: "right" }}>ספק</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>בקשות</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Tokens</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>עלות</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>חינמי</th>
                </tr>
              </thead>
              <tbody>
                {modelUsage.map((m, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-muted)" }}>
                    <td style={{ padding: "12px" }}>{m._id.model}</td>
                    <td style={{ padding: "12px" }}><span className="badge badge-secondary">{m._id.provider}</span></td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{m.requests}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{m.tokens.toLocaleString()}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>${m.cost.toFixed(4)}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{m.isFree ? "✅" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
