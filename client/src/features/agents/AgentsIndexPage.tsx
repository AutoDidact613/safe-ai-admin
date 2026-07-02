/**
 * client/src/features/agents/AgentsIndexPage.tsx
 *
 * Layout wrapper for the entire agents marketplace feature.
 * Renders tab navigation + outlet for sub-pages.
 * Registered in AppRouter as the parent route for /download-agents/*
 */

import { NavLink, Outlet } from "react-router-dom";
import "../../styles/agents.css";

const TABS = [
  { to: "/download-agents", label: "🏠 גלריה", end: true },
  { to: "/download-agents/submit", label: "➕ הוסיפי אייג'נט" },
  { to: "/download-agents/stats", label: "📊 סטטיסטיקות" },
];

export default function AgentsIndexPage() {
  return (
    <div className="agents-layout">
      <div className="agents-header">
        <h1 className="agents-title">🤖 Agents Marketplace</h1>
        <p className="agents-subtitle">גלי, הורידי והוסיפי אייג'נטים לקהילה</p>
      </div>

      <nav className="agents-tabs">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              isActive ? "agents-tab agents-tab--active" : "agents-tab"
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <div className="agents-content">
        <Outlet />
      </div>
    </div>
  );
}
