import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { API_ENDPOINTS, apiCall } from "../config/api";
import "../styles/news-page.css";

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  source?: string;
  tags?: string[];
  imageUrl?: string;
  createdAt?: string;
}

interface NewsFormState {
  title: string;
  content: string;
  source: string;
  tags: string;
  imageUrl: string;
}

const initialFormState: NewsFormState = {
  title: "",
  content: "",
  source: "",
  tags: "",
  imageUrl: "",
};

function formatRelativeTime(value?: string) {
  if (!value) return "";
  return formatDistanceToNow(new Date(value), { locale: he, addSuffix: true });
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SkeletonList({ count }: { count: number }) {
  return (
    <div className="news-skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="news-skeleton-row">
          <div className="news-skeleton-image news-skeleton-shimmer" />
          <div className="news-skeleton-body">
            <div className="news-skeleton-line news-skeleton-shimmer short" />
            <div className="news-skeleton-line news-skeleton-shimmer" />
            <div className="news-skeleton-line news-skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AiNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<NewsFormState>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const PAGE_LIMIT = 10;

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    void loadNews(page);
  }, [page]);

  const loadNews = async (pageNumber = 1) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCall<NewsItem[]>(
        `${API_ENDPOINTS.news}?page=${pageNumber}&limit=${PAGE_LIMIT}`,
      );

      setNews((prev) => (pageNumber === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === PAGE_LIMIT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת החדשות");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setShowForm(false);
    setSelectedFileName(null);
  };

  const handleStartCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setShowForm(true);
    setError(null);
    setSelectedFileName(null);
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);

    try {
      setUploadingImage(true);
      setError(null);

      const urlResponse = await fetch(API_ENDPOINTS.upload.getUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          context: "newsImage",
        }),
      });

      if (!urlResponse.ok) {
        const data = await urlResponse.json().catch(() => null);
        throw new Error(data?.error || "נכשלה קבלת קישור מאובטח מהשרת");
      }

      const { uploadUrl, fileUrl } = await urlResponse.json();

      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!s3Response.ok) throw new Error("העלאת התמונה נכשלה");

      setFormData((prev) => ({ ...prev, imageUrl: fileUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאת התמונה");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    setSelectedFileName(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      setError("יש למלא כותרת ותוכן");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        source: formData.source.trim() || "User",
        tags: tagsArray,
        imageUrl: formData.imageUrl || undefined,
      };

      if (editingId) {
        await apiCall(`${API_ENDPOINTS.news}/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiCall(API_ENDPOINTS.news, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await loadNews();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירת החדשות");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: NewsItem) => {
    setEditingId(item._id);
    setFormData({
      title: item.title,
      content: item.content,
      source: item.source || "",
      tags: item.tags?.join(", ") || "",
      imageUrl: item.imageUrl || "",
    });
    setShowForm(true);
    setError(null);
    setSelectedFileName(null);
  };

  const openDeleteModal = (item: NewsItem) => {
    setDeleteTarget(item);
    setError(null);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setSubmitting(true);
      setError(null);
      await apiCall(`${API_ENDPOINTS.news}/${deleteTarget._id}`, {
        method: "DELETE",
      });
      await loadNews();
      if (editingId === deleteTarget._id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקת החדשות");
    } finally {
      setSubmitting(false);
      setDeleteTarget(null);
    }
  };

  const allTags = useMemo(() => {
    const set = new Set<string>();
    news.forEach((item) => item.tags?.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [news]);

  const filteredNews = news.filter((item) => {
    const matchesSearch = item.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase().trim());
    const matchesTag = !activeTag || item.tags?.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  const [featured, ...rest] = filteredNews;
  const showSkeleton = loading && news.length === 0;

  return (
    <div className="news-page">
      <header className="news-masthead">
        <div className="news-masthead-inner">
          <div className="news-brand">
            <div className="news-brand-mark">AI</div>
            <div className="news-brand-text">
              <h1>AI News</h1>
              <p>חדשות AI הכי חמות שיש</p>
            </div>
          </div>
          {isAdmin && (
            <button type="button" onClick={handleStartCreate} className="btn-add-news">
              + הוספת חדשות
            </button>
          )}
        </div>

        <div className="news-toolbar">
          <div className="news-search-wrap">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חיפוש לפי כותרת"
              className="news-search-input"
            />
            <span className="news-search-icon">
              <SearchIcon />
            </span>
          </div>

          {allTags.length > 0 && (
            <div className="news-tag-filter">
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={`news-tag-pill${activeTag === null ? " active" : ""}`}
              >
                הכל
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
                  className={`news-tag-pill${activeTag === tag ? " active" : ""}`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="news-main">
        {error && <div className="news-error-message">{error}</div>}

        {showSkeleton ? (
          <SkeletonList count={7} />
        ) : news.length === 0 ? (
          <div className="news-empty">
            <h3>אין חדשות עדיין</h3>
            <p>ברגע שיתווספו חדשות הן יופיעו כאן</p>
            {isAdmin && (
              <button type="button" onClick={handleStartCreate} className="btn-add-news">
                צור חדשות ראשונה
              </button>
            )}
          </div>
        ) : filteredNews.length === 0 ? (
          <p className="news-empty-message">אין חדשות מתאימות.</p>
        ) : (
          <>
            <div className="news-results-count">{filteredNews.length} תוצאות</div>

            <div className="news-list">
              {featured && (
                <article className="news-list-row news-list-row--lead">
                  <Link to={`/ai-news/${featured._id}`} className="news-list-image-link">
                    {featured.imageUrl ? (
                      <img src={featured.imageUrl} alt={featured.title} className="news-list-image" />
                    ) : (
                      <div className="news-list-image-placeholder">
                        {featured.title.trim().charAt(0)}
                      </div>
                    )}
                  </Link>
                  <div className="news-list-body">
                    <span className="news-lead-badge">הכתבה המובילה</span>
                    {featured.tags?.[0] && <span className="news-card-eyebrow">#{featured.tags[0]}</span>}
                    <Link to={`/ai-news/${featured._id}`} className="news-article-title">
                      {featured.title}
                    </Link>
                    <p className="news-preview">{featured.content}</p>
                    <div className="news-card-footer">
                      <div className="news-item-meta">
                        <span className="news-byline-source">{featured.source || "User"}</span>
                        <span className="news-byline-dot">·</span>
                        <span className="news-date">{formatRelativeTime(featured.createdAt)}</span>
                      </div>
                      {isAdmin && (
                        <div className="news-card-actions">
                          <button type="button" onClick={() => handleEdit(featured)} className="btn-edit">
                            ערוך
                          </button>
                          <button type="button" onClick={() => openDeleteModal(featured)} className="btn-delete">
                            מחק
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )}

              {rest.map((item) => (
                <article key={item._id} className="news-list-row">
                  <Link to={`/ai-news/${item._id}`} className="news-list-image-link">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.title} className="news-list-image" />
                    ) : (
                      <div className="news-list-image-placeholder">
                        {item.title.trim().charAt(0)}
                      </div>
                    )}
                  </Link>
                  <div className="news-list-body">
                    {item.tags?.[0] && <span className="news-card-eyebrow">#{item.tags[0]}</span>}
                    <Link to={`/ai-news/${item._id}`} className="news-article-title">
                      {item.title}
                    </Link>
                    <p className="news-preview">{item.content}</p>
                    <div className="news-card-footer">
                      <div className="news-item-meta">
                        <span className="news-byline-source">{item.source || "User"}</span>
                        <span className="news-byline-dot">·</span>
                        <span className="news-date">{formatRelativeTime(item.createdAt)}</span>
                      </div>
                      {isAdmin && (
                        <div className="news-card-actions">
                          <button type="button" onClick={() => handleEdit(item)} className="btn-edit">
                            ערוך
                          </button>
                          <button type="button" onClick={() => openDeleteModal(item)} className="btn-delete">
                            מחק
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {hasMore && (
              <div className="load-more-wrapper">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                  className="load-more-btn"
                >
                  {loading ? "טוען..." : "טען עוד"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div
            className="modal-content news-form-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="news-form-title">{editingId ? "עריכת חדשות" : "יצירת חדשות"}</h3>

            <form onSubmit={handleSubmit} className="news-form-inputs">
              <input
                type="text"
                placeholder="כותרת"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="news-input-field"
              />

              <textarea
                placeholder="תוכן (נתמכת כתיבה במארקדאון - Markdown)"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className="news-textarea"
              />

              <input
                type="text"
                placeholder="מקור (אופציונלי)"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="news-input-field"
              />

              <input
                type="text"
                placeholder="תגיות (מופרדות בפסיק)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="news-input-field"
              />

              <div className="news-image-upload">
                {formData.imageUrl ? (
                  <div className="news-image-preview-wrapper">
                    <img src={formData.imageUrl} alt="תצוגה מקדימה" className="news-image-preview" />
                    <button type="button" onClick={handleRemoveImage} className="btn-reset">
                      הסר תמונה
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="news-image-file-input"
                    className={`news-file-field${uploadingImage ? " is-disabled" : ""}`}
                  >
                    <input
                      id="news-image-file-input"
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/gif"
                      onChange={handleImageChange}
                      disabled={uploadingImage}
                      aria-label="בחירת תמונה לכתבה"
                      className="news-file-input-hidden"
                    />
                    <span className="news-file-button">בחירת קובץ</span>
                    <span className="news-file-name">
                      {selectedFileName || "לא נבחר קובץ"}
                    </span>
                  </label>
                )}
                {uploadingImage && <span className="news-upload-status">מעלה תמונה...</span>}
              </div>

              <div className="news-form-buttons">
                <button type="submit" disabled={submitting || uploadingImage} className="btn-submit">
                  {submitting ? "שומר..." : editingId ? "עדכון" : "שמירה"}
                </button>
                <button type="button" onClick={resetForm} className="btn-reset">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">אישור מחיקה</h2>
            <p className="modal-message">
              האם אתה בטוח שברצונך למחוק את הפריט "{deleteTarget.title}"?
            </p>
            <div className="modal-buttons">
              <button type="button" onClick={cancelDelete} className="btn-cancel">
                לא
              </button>
              <button type="button" onClick={confirmDelete} disabled={submitting} className="btn-confirm-delete">
                כן
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
