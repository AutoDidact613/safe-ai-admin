import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "דף הבית" },
  { to: "/safeai-ui", label: "SafeAI UI" },
  { to: "/home", label: "לוח בקרה" },
  { to: "/", label: "Dashboard" },

  // management
  { to: "/tasks", label: "Tasks Manager" }, 
  { to: "/users", label: "Users" },
  { to: "/prompts", label: "Prompts" },
  { to: "/models", label: "Models" },
  { to: "/agents", label: "Agents" },
  { to: "/api-keys", label: "API Keys" },
  { to: "/stats", label: "Usage" },
  { to: "/inquiry-list", label: "Inquiries List" },
  { to: "/table-data", label: "Table Data" },
  { to: "/data-history", label: "Data History" },
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