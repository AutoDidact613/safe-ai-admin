import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { HomeIcon } from "../landing/icons";

export interface SidebarItem {
  key: string;
  icon: ReactNode;
  label: string;
  path: string;
}

interface DashboardSidebarProps {
  homeLabel: string;
  items: SidebarItem[];
}

// "Home" is the current page itself — shown active and non-navigating,
// the rest link out to their real routes.
export default function DashboardSidebar({ homeLabel, items }: DashboardSidebarProps) {
  const navigate = useNavigate();

  return (
    <nav className="dash-sidebar" aria-label={homeLabel}>
      <div className="dash-sidebar-item dash-sidebar-item-active">
        <HomeIcon size={18} />
        <span>בית</span>
      </div>
      {items.map((item) => (
        <button key={item.key} className="dash-sidebar-item" onClick={() => navigate(item.path)}>
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
