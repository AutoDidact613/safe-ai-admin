import { Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { HomeIcon } from "../landing/icons";

export interface SidebarItem {
  key: string;
  icon: ReactNode;
  label: string;
  path: string;
}

export interface SidebarCrossLink {
  icon: ReactNode;
  label: string;
  path: string;
}

interface DashboardSidebarProps {
  homeLabel: string;
  items: SidebarItem[];
  crossLink: SidebarCrossLink;
}

// "Home" is the current page itself — shown active and non-navigating,
// the rest link out to their real routes. The brand link at the top returns
// to the main site, and the cross-link at the bottom moves between the Hub
// and Platform dashboards — per team decision (SCRUM-227) they serve the
// same single audience, so both stay reachable from either one.
export default function DashboardSidebar({ homeLabel, items, crossLink }: DashboardSidebarProps) {
  const navigate = useNavigate();

  return (
    <nav className="dash-sidebar" aria-label={homeLabel}>
      <Link to="/" className="dash-sidebar-brand">
        SafeAI<span>613</span>
      </Link>

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

      <div className="dash-sidebar-divider" role="separator" />
      <button className="dash-sidebar-item" onClick={() => navigate(crossLink.path)}>
        {crossLink.icon}
        <span>{crossLink.label}</span>
      </button>
    </nav>
  );
}
