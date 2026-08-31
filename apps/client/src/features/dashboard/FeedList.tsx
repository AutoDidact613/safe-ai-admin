export interface FeedItem {
  id: string;
  title: string;
  meta: string;
  onClick: () => void;
}

interface FeedListProps {
  title: string;
  items: FeedItem[];
  loading: boolean;
  failed: boolean;
  emptyLabel: string;
}

export default function FeedList({ title, items, loading, failed, emptyLabel }: FeedListProps) {
  return (
    <div className="dash-feed">
      <h2 className="dash-feed-title">{title}</h2>
      {loading ? (
        <p className="dash-feed-status">טוען…</p>
      ) : failed ? (
        <p className="dash-feed-status">לא ניתן לטעון כרגע.</p>
      ) : items.length === 0 ? (
        <p className="dash-feed-status">{emptyLabel}</p>
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
