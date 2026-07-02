/**
 * client/src/features/agents/AgentsMarketplace.tsx
 *
 * Main gallery page — grid of agent cards with search and filters.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAgents } from "./api/agentsApi";
import { Agent, AgentFilters } from "./types/agent.types";

const SORT_OPTIONS = [
  { value: "downloads", label: "🔥 הכי פופולרי" },
  { value: "rating", label: "⭐ הכי מדורג" },
  { value: "newest", label: "🆕 החדש ביותר" },
];

export default function AgentsMarketplace() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<AgentFilters>({
    search: "",
    professional_field: "",
    task: "",
    framework: "",
    sortBy: "downloads",
  });
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAgents({ ...filters, page });
      setAgents(res.agents);
      setTotal(res.total);
    } catch {
      setError("שגיאה בטעינת האייג'נטים. נסי שוב.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const t = setTimeout(load, filters.search ? 400 : 0);
    return () => clearTimeout(t);
  }, [load, filters.search]);

  const setFilter = (key: keyof AgentFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  return (
    <div className="agents-marketplace">
      {/* Search + Filters */}
      <div className="agents-filters-bar">
        <div className="agents-search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            className="agents-search-input"
            type="text"
            placeholder="חפשי אייג'נט לפי שם או תיאור..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>

        <div className="agents-filter-row">
          <select
            value={filters.professional_field}
            onChange={(e) => setFilter("professional_field", e.target.value)}
            className="agents-filter-select"
          >
            <option value="">כל התחומים</option>
            <option value="Financial Management">ניהול פיננסי</option>
            <option value="Legal">משפטי</option>
            <option value="Medical">רפואה</option>
            <option value="Education">חינוך</option>
            <option value="Business Automation">אוטומציה עסקית</option>
            <option value="Software Development">פיתוח תוכנה</option>
          </select>

          <select
            value={filters.framework}
            onChange={(e) => setFilter("framework", e.target.value)}
            className="agents-filter-select"
          >
            <option value="">כל ה-Frameworks</option>
            <option value="LangGraph">LangGraph</option>
            <option value="CrewAI">CrewAI</option>
            <option value="AutoGen">AutoGen</option>
            <option value="LangChain">LangChain</option>
            <option value="Custom">Custom</option>
          </select>

          <select
            value={filters.sortBy}
            onChange={(e) => setFilter("sortBy", e.target.value as AgentFilters["sortBy"])}
            className="agents-filter-select"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="agents-results-count">
          {total} אייג'נטים נמצאו
        </p>
      )}

      {/* Error */}
      {error && <div className="agents-error">{error}</div>}

      {/* Grid */}
      {loading ? (
        <div className="agents-loading">
          <div className="agents-spinner" />
          <p>טוען אייג'נטים...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="agents-empty">
          <span>🤖</span>
          <p>לא נמצאו אייג'נטים התואמים את החיפוש</p>
        </div>
      ) : (
        <div className="agents-grid">
          {agents.map((agent) => (
            <div
              key={agent._id}
              className="agent-card"
              onClick={() => navigate(`/download-agents/${agent._id}`)}
            >
              <div className="agent-card-icon">
                {agent.icon ? (
                  <div dangerouslySetInnerHTML={{ __html: agent.icon }} />
                ) : (
                  <span className="agent-icon-placeholder">🤖</span>
                )}
              </div>

              <div className="agent-card-body">
                <h3 className="agent-card-name">{agent.name}</h3>
                <p className="agent-card-creator">מאת {agent.creator_name}</p>
                <p className="agent-card-desc">{agent.description}</p>

                <div className="agent-card-tags">
                  {agent.professional_fields.slice(0, 2).map((f) => (
                    <span key={f} className="agent-badge agent-badge--field">{f}</span>
                  ))}
                  {agent.technical_specifications?.framework && (
                    <span className="agent-badge agent-badge--framework">
                      {agent.technical_specifications.framework}
                    </span>
                  )}
                </div>
              </div>

              <div className="agent-card-footer">
                <span className="agent-stat">⬇ {agent.downloads.toLocaleString()}</span>
                {agent.ratingCount > 0 && (
                  <span className="agent-stat">⭐ {agent.rating.toFixed(1)}</span>
                )}
                <button className="agent-btn-details">פרטים נוספים ›</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 12 && (
        <div className="agents-pagination">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹ הקודם</button>
          <span>עמוד {page}</span>
          <button disabled={agents.length < 12} onClick={() => setPage((p) => p + 1)}>הבא ›</button>
        </div>
      )}
    </div>
  );
}
