import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS, apiCall } from "../config/api";
import "../styles/news-page.css";


interface NewsItem {
  _id: string;
  title: string;
  content: string;
  source?: string;
  tags?: string[];
  createdAt?: string;
}

interface NewsFormState {
  title: string;
  content: string;
  source: string;
  tags: string;
}

const initialFormState: NewsFormState = {
  title: "",
  content: "",
  source: "",
  tags: "",
};

export default function AiNewsPage() {
  const { t } = useTranslation();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<NewsFormState>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NewsItem | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
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
      setError(err instanceof Error ? err.message : t("aiNews.loadErrorMsg"));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setEditingId(null);
    setShowForm(false);
  };

  const handleStartCreate = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setShowForm(true);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      setError(t("aiNews.titleContentRequiredMsg"));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const tagsArray = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      if (editingId) {
        await apiCall(`${API_ENDPOINTS.news}/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({
            title: formData.title.trim(),
            content: formData.content.trim(),
            source: formData.source.trim() || "User",
            tags: tagsArray,
          }),
        });
      } else {
        await apiCall(API_ENDPOINTS.news, {
          method: "POST",
          body: JSON.stringify({
            title: formData.title.trim(),
            content: formData.content.trim(),
            source: formData.source.trim() || "User",
            tags: tagsArray,
          }),
        });
      }

      await loadNews();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("aiNews.saveErrorMsg"));
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
    });
    setShowForm(true);
    setError(null);
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
      setError(err instanceof Error ? err.message : t("aiNews.deleteErrorMsg"));
    } finally {
      setSubmitting(false);
      setDeleteTarget(null);
    }
  };

  const filteredNews = news.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase().trim()),
  );

  if (loading) {
    return (
      <div className="news-loading-container">
        <div className="news-loading-content">
          <div className="news-spinner" />
          <div className="news-loading-text">{t("aiNews.loadingText")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="news-page-container">
      <div className="news-card-wrapper">
        <div className="news-header-section">
          <div className="news-header-content">
            <h1 className="news-header-title">AI News</h1>
            <p className="news-header-subtitle">
              {t("aiNews.subtitle")}
            </p>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleStartCreate}
              className="btn-add-news"
            >
              {t("aiNews.addNewsBtn")}
            </button>)}
        </div>

        {!showForm && (
          <div className="news-search-section">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("aiNews.searchPlaceholder")}
              className="news-search-input"
            />
            <div className="news-results-count">
              {t("aiNews.resultsCount", { count: filteredNews.length })}
            </div>
          </div>
        )}

        {error && (
          <div className="news-error-message">
            {error}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="news-form-container"
          >
            <h3 className="news-form-title">
              {editingId ? t("aiNews.editNewsTitle") : t("aiNews.createNewsTitle")}
            </h3>

            <div className="news-form-inputs">
              <input
                type="text"
                placeholder={t("aiNews.titlePlaceholder")}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="news-input-field"
              />

              <textarea
                placeholder={t("aiNews.contentPlaceholder")}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className="news-textarea"
              />

              <input
                type="text"
                placeholder={t("aiNews.sourcePlaceholder")}
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="news-input-field"
              />

              <input
                type="text"
                placeholder={t("aiNews.tagsPlaceholder")}
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="news-input-field"
              />

              <div className="news-form-buttons">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-submit"
                >
                  {submitting ? t("aiNews.savingBtn") : editingId ? t("aiNews.updateBtn") : t("aiNews.saveBtn")}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-reset"
                >
                  {t("aiNews.resetBtn")}
                </button>
              </div>
            </div>
          </form>
        )}

        {!showForm && (
          news.length === 0 ? (
            <div className="news-empty">
              <h3>{t("aiNews.noNewsTitle")}</h3>
              <p>{t("aiNews.noNewsMessage")}</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="btn-add-news"
                >
                  {t("aiNews.createFirstNewsBtn")}
                </button>
              )}
            </div>
          ) : filteredNews.length === 0 ? (
            <p className="news-empty-message">{t("aiNews.noMatchingNewsMessage")}</p>
          ) : (
            <>
              <div className="news-grid">
                {filteredNews.map((item) => (
                  <article
                    key={item._id}
                    className="news-article-card"
                  >
                    <div className="news-article-header">
                      <div>
                        <Link to={`/ai-news/${item._id}`} className="news-article-title">
                          {item.title}
                        </Link>
                        <div className="news-item-meta">
                          <span className="news-date">
                            {new Date(item.createdAt || "").toLocaleDateString("he-IL", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        {item.tags?.length ? (
                          <div className="news-tag-list">
                            {item.tags.map((tag) => (
                              <span key={tag} className="news-tag">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="news-article-actions">
                          {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="btn-edit"
                        >
                          {t("common.edit")}
                        </button>)}
                          {isAdmin && (
                        <button
                          type="button"
                          onClick={() => openDeleteModal(item)}
                          className="btn-delete"
                        >
                          {t("common.delete")}
                        </button>)}
                      </div>
                    </div>
                    <p className="news-preview">
                      {item.content.length > 120
                        ? item.content.slice(0, 120) + "..."
                        : item.content}
                    </p>
                  </article>
                ))}
              </div>
              {hasMore && (
                <div className="load-more-wrapper">
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    className="load-more-btn"
                  >
                    {t("aiNews.loadMoreBtn")}
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">{t("aiNews.confirmDeleteTitle")}</h2>
            <p className="modal-message">
              {t("aiNews.confirmDeleteMessage", { title: deleteTarget.title })}
            </p>
            <div className="modal-buttons">
              <button
                type="button"
                onClick={cancelDelete}
                className="btn-cancel"
              >
                {t("aiNews.noBtn")}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={submitting}
                className="btn-confirm-delete"
              >
                {t("aiNews.yesBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
