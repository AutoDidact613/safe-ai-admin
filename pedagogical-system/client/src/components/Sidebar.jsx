import { NavLink } from "react-router-dom";
import { useAuth, ROLE_LABELS } from "../context/AuthContext";

const MODULES = [
  { path: "/syllabus", label: "סילבוסים" },
  { path: "/lesson-logs", label: "תיעוד שיעורים" },
  { path: "/submissions", label: "הגשות" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">מערכת ניהול פדגוגי</div>
        <div className="sidebar-user">
          <span className="role-badge">{ROLE_LABELS[user.role]}</span>
          <span>{user.name}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {MODULES.map((m) => (
          <NavLink
            key={m.path}
            to={m.path}
            className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
          >
            {m.label}
          </NavLink>
        ))}
      </nav>

      <button className="logout-button" onClick={logout}>
        התנתקות
      </button>
    </aside>
  );
}
