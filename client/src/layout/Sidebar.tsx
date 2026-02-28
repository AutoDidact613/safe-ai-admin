import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/users", label: "Users" },
  { to: "/groups", label: "Groups" },
  { to: "/models", label: "Models" },
  { to: "/agents", label: "Agents" },
  { to: "/api-keys", label: "API Keys" },
  { to: "/stats", label: "Usage" },
  { to: "/example", label: "Example (Redux)" },
  { to: "/filter-admin", label: "Filter Admin" },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">Safe-AI Admin</div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
