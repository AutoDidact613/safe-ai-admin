/**
 * client/src/features/agents/AgentStatsPage.tsx
 *
 * Dashboard: top downloads, newest, top rated, framework breakdown.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchStats } from "./api/agentsApi";
import type { Agent, AgentStatsResponse } from "./types/agent.types";
import AgentIcon from "./AgentIcon";

export default function AgentStatsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AgentStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => setError("שגיאה בטעינת הסטטיסטיקות"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="agents-loading"><div className="agents-spinner" /><p>טוען סטטיסטיקות...</p></div>;
  if (error || !stats) return <div className="agents-error">{error}</div>;

  const maxCount = Math.max(...(stats.frameworkStats.map((f) => f.count) || [1]));

  return (
    <div className="agent-stats-page">
      <h1>📊 סטטיסטיקות Marketplace</h1>

      {/* Summary row */}
      <div className="agent-stats-summary">
        <div className="agent-stats-card">
          <span className="agent-stats-number">{stats.totalAgents}</span>
          <span className="agent-stats-label">סה"כ אייג'נטים</span>
        </div>
        <div className="agent-stats-card">
          <span className="agent-stats-number">{stats.totalDownloads.toLocaleString()}</span>
          <span className="agent-stats-label">סה"כ הורדות</span>
        </div>
      </div>

      {/* Top + Newest */}
      <div className="agent-stats-grid">
        <AgentRankList
          title="🏆 הכי פופולרים"
          agents={stats.topByDownloads}
          renderMeta={(a) => `⬇ ${a.downloads.toLocaleString()}`}
          onSelect={(id) => navigate(`/agents-marketplace/${id}`)}
        />
        <AgentRankList
          title="🆕 חדשים ביותר"
          agents={stats.newest}
          renderMeta={(a) => new Date(a.createdAt).toLocaleDateString("he-IL")}
          onSelect={(id) => navigate(`/agents-marketplace/${id}`)}
        />
        <AgentRankList
          title="⭐ הכי מדורגים"
          agents={stats.topByRating}
          renderMeta={(a) => `⭐ ${a.rating.toFixed(1)} (${a.ratingCount})`}
          onSelect={(id) => navigate(`/agents-marketplace/${id}`)}
        />
      </div>

      {/* Framework breakdown */}
      {stats.frameworkStats.length > 0 && (
        <div className="agent-stats-section">
          <h2>🛠 Frameworks פופולריים</h2>
          <div className="agent-framework-bars">
            {stats.frameworkStats.map((f) => (
              <div key={f._id} className="agent-framework-bar-row">
                <span className="agent-framework-name">{f._id || "לא ידוע"}</span>
                <div className="agent-framework-bar-track">
                  <div
                    className="agent-framework-bar-fill"
                    style={{ width: `${(f.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="agent-framework-count">{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentRankList({
  title,
  agents,
  renderMeta,
  onSelect,
}: {
  title: string;
  agents: Agent[];
  renderMeta: (a: Agent) => string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="agent-rank-list">
      <h2>{title}</h2>
      {agents.length === 0 ? (
        <p className="agent-rank-empty">אין נתונים עדיין</p>
      ) : (
        <ol>
          {agents.map((a, i) => (
            <li key={a._id} className="agent-rank-item" onClick={() => onSelect(a._id)}>
              <span className="agent-rank-num">{i + 1}</span>
              <div className="agent-rank-icon">
                <AgentIcon svg={a.icon} />
              </div>
              <div className="agent-rank-info">
                <span className="agent-rank-name">{a.name}</span>
                <span className="agent-rank-meta">{renderMeta(a)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
