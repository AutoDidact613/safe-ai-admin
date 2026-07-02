/**
 * client/src/features/agents/AgentDetailPage.tsx
 *
 * Full detail view for a single agent.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchAgentById, recordDownload } from "./api/agentsApi";
import { Agent } from "./types/agent.types";

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchAgentById(id)
      .then((res) => setAgent(res.agent))
      .catch(() => setError("האייג'נט לא נמצא."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    if (!agent) return;
    await recordDownload(agent._id).catch(() => {});
    window.open(agent.download_url, "_blank", "noopener,noreferrer");
  };

  if (loading) return <div className="agents-loading"><div className="agents-spinner" /><p>טוען...</p></div>;
  if (error || !agent) return <div className="agents-error">{error || "שגיאה לא ידועה"}</div>;

  const specs = agent.technical_specifications;

  return (
    <div className="agent-detail">
      <button className="agent-back-btn" onClick={() => navigate("/download-agents")}>
        ‹ חזרה לגלריה
      </button>

      {/* Header */}
      <div className="agent-detail-header">
        <div className="agent-detail-icon">
          {agent.icon ? (
            <div dangerouslySetInnerHTML={{ __html: agent.icon }} />
          ) : (
            <span style={{ fontSize: 64 }}>🤖</span>
          )}
        </div>
        <div className="agent-detail-meta">
          <h1>{agent.name}</h1>
          <p className="agent-detail-version">
            v{agent.version} &nbsp;|&nbsp; מאת <strong>{agent.creator_name}</strong>
          </p>
          {agent.ratingCount > 0 && (
            <p className="agent-detail-rating">
              ⭐ {agent.rating.toFixed(1)} ({agent.ratingCount} דירוגים)
            </p>
          )}
          <button className="agent-download-btn" onClick={handleDownload}>
            ⬇ הורד עכשיו
          </button>
        </div>
      </div>

      {/* Description */}
      <section className="agent-detail-section">
        <h2>📝 תיאור</h2>
        <p>{agent.description}</p>
      </section>

      {/* Target audience */}
      {agent.target_audience && (
        <section className="agent-detail-section">
          <h2>🎯 קהל יעד</h2>
          <p>{agent.target_audience}</p>
        </section>
      )}

      {/* Professional fields */}
      {agent.professional_fields?.length > 0 && (
        <section className="agent-detail-section">
          <h2>🏢 תחומים מקצועיים</h2>
          <div className="agent-badges-row">
            {agent.professional_fields.map((f) => (
              <span key={f} className="agent-badge agent-badge--field">{f}</span>
            ))}
          </div>
        </section>
      )}

      {/* Tasks */}
      {agent.tasks_capable_of_performing?.length > 0 && (
        <section className="agent-detail-section">
          <h2>⚙️ משימות</h2>
          <div className="agent-badges-row">
            {agent.tasks_capable_of_performing.map((t) => (
              <span key={t} className="agent-badge agent-badge--task">{t}</span>
            ))}
          </div>
        </section>
      )}

      {/* Example questions */}
      {agent.examples_of_suitable_questions?.length > 0 && (
        <section className="agent-detail-section">
          <h2>💬 דוגמאות לשאלות מתאימות</h2>
          <ul className="agent-examples-list">
            {agent.examples_of_suitable_questions.map((q, i) => (
              <li key={i}>"{q}"</li>
            ))}
          </ul>
        </section>
      )}

      {/* Technical specs */}
      {specs && (
        <section className="agent-detail-section">
          <h2>🛠 מפרט טכני</h2>
          <div className="agent-tech-grid">
            {specs.framework && <div className="agent-tech-item"><span>Framework</span><strong>{specs.framework}</strong></div>}
            {specs.llm_provider && <div className="agent-tech-item"><span>LLM Provider</span><strong>{specs.llm_provider}</strong></div>}
            {specs.supported_models?.length > 0 && (
              <div className="agent-tech-item agent-tech-item--wide">
                <span>מודלים נתמכים</span>
                <strong>{specs.supported_models.join(", ")}</strong>
              </div>
            )}
            {specs.required_permissions?.length > 0 && (
              <div className="agent-tech-item agent-tech-item--wide">
                <span>הרשאות נדרשות</span>
                <strong>{specs.required_permissions.join(", ")}</strong>
              </div>
            )}
          </div>
          {specs.features_enabled && (
            <div className="agent-features-row">
              <FeatureBadge label="RAG" enabled={specs.features_enabled.rag} />
              <FeatureBadge label="Web Search" enabled={specs.features_enabled.web_search} />
              <FeatureBadge label="Code Execution" enabled={specs.features_enabled.code_execution} />
              <FeatureBadge label="MCP" enabled={specs.features_enabled.mcp_support} />
            </div>
          )}
        </section>
      )}

      {/* Links */}
      <section className="agent-detail-section">
        <h2>🔗 קישורים</h2>
        <div className="agent-links">
          <a href={agent.repository_url} target="_blank" rel="noopener noreferrer">
            📁 GitHub Repository
          </a>
          {agent.release_date && <span>📅 תאריך שחרור: {agent.release_date}</span>}
          {agent.contact_information && (
            <a href={`mailto:${agent.contact_information}`}>
              📧 {agent.contact_information}
            </a>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="agent-detail-section agent-detail-stats">
        <span>⬇ {agent.downloads.toLocaleString()} הורדות</span>
        <span>📦 גרסה {agent.version}</span>
      </section>
    </div>
  );
}

function FeatureBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span className={`agent-feature-badge ${enabled ? "agent-feature-badge--on" : "agent-feature-badge--off"}`}>
      {enabled ? "✅" : "❌"} {label}
    </span>
  );
}
