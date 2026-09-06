import type { ReactNode } from "react";

export interface FeedItem {
  id: string;
  title: string;
  meta: string;
  description?: string;
  icon?: ReactNode;
  onClick: () => void;
}

interface FeedListProps {
  title: string;
  items: FeedItem[];
  loading: boolean;
  failed: boolean;
  emptyLabel: string;
  variant?: "list" | "cards" | "updates";
}

export default function FeedList({ title, items, loading, failed, emptyLabel, variant = "list" }: FeedListProps) {
  return (
    <div className="dash-feed">
      <h2 className="dash-feed-title">{title}</h2>
      {loading ? (
        <p className="dash-feed-status">טוען…</p>
      ) : failed ? (
        <p className="dash-feed-status">לא ניתן לטעון כרגע.</p>
      ) : items.length === 0 ? (
        <p className="dash-feed-status">{emptyLabel}</p>
      ) : variant === "cards" ? (
        <div className="dash-card-grid">
          {items.map((item) => (
            <button key={item.id} className="dash-card" onClick={item.onClick}>
              {item.icon && <span className="dash-card-icon">{item.icon}</span>}
              <span className="dash-card-title">{item.title}</span>
              <span className="dash-card-meta">{item.meta}</span>
            </button>
          ))}
        </div>
      ) : variant === "updates" ? (
        <div className="dash-updates-list">
          {items.map((item) => (
            <button key={item.id} className="dash-update-item" onClick={item.onClick}>
              {item.icon && <span className="dash-update-icon">{item.icon}</span>}
              <span className="dash-update-text">
                <span className="dash-update-date">{item.meta}</span>
                <span className="dash-update-title">{item.title}</span>
                {item.description && <span className="dash-update-desc">{item.description}</span>}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <ul className="dash-feed-list">
          {items.map((item) => (
            <li key={item.id}>
              <button className="dash-feed-item" onClick={item.onClick}>
                <span className="dash-feed-item-title">{item.title}</span>
                <span className="dash-feed-item-meta">{item.meta}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
