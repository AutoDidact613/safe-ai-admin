import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "../styles/recommended-guides-page.css";

interface Guide {
  id: string;
  title: string;
  description: string;
  link: string;
  duration: string;
  language: string;
  technologies: string;
  rating: string;
  creator?: string;
  feedback?: string;
  sheet: string;
}

type ViewMode = "cards" | "table";

interface SheetInfo {
  name: string;
  gid: string;
}

// Parses CSV text into rows of fields, respecting quoted fields that may
// contain commas, escaped quotes ("") and embedded newlines.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // ignore, handled by the following \n
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

const SHEETS: SheetInfo[] = [
  { name: "AI Engineering (פיתוח סוכנים-Workflows)", gid: "593094152" },
  { name: "Data Science (AI & ML)", gid: "0" },
  {
    name: "שימוש בכלי AI לפיתוח לעבודה יומיומית (Claude Code, Copilot)",
    gid: "825625850",
  },
  { name: "ויב קודינג (Vibe Coding / בניית אתרים בקלטקס)", gid: "1806937289" },
];

export default function RecommendedGuidesPage() {
  const { t } = useTranslation();
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sheetFilter, setSheetFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // Load guides from all Google Sheets
  useEffect(() => {
    const loadGuides = async () => {
      try {
        setLoading(true);
        const sheetId = "1I8y1bH400KnpkcD1q-gGYjy-uM__i3Xs-MFqc9uJakY";
        const allGuides: Guide[] = [];

        // Load from all sheets
        for (const sheet of SHEETS) {
          try {
            const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${sheet.gid}`;
            const response = await fetch(url);
            if (!response.ok) {
              console.warn(`Sheet ${sheet.name} returned ${response.status}`);
              continue;
            }
            const text = await response.text();

            // Google occasionally returns an HTML error/consent page instead
            // of the CSV export (e.g. rate limiting) - skip it rather than
            // parsing garbage rows out of the markup.
            if (text.trim().toLowerCase().startsWith("<")) {
              console.error(`Sheet ${sheet.name} did not return CSV data`);
              continue;
            }

            const rows = parseCsv(text);

            // Skip header row
            for (let i = 1; i < rows.length; i++) {
              const values = rows[i];
              if (!values || values.every((value) => !value.trim())) continue;

              if (values.length >= 6) {
                allGuides.push({
                  id: `${sheet.gid}-${i}`,
                  link: values[0]?.trim() || "",
                  description: values[1]?.trim() || "",
                  duration: values[3]?.trim() || t("recommendedGuides.notSpecified"),
                  language: values[4]?.trim() || t("recommendedGuides.notSpecified"),
                  technologies: values[5]?.trim() || t("recommendedGuides.notSpecified"),
                  creator: values[7]?.trim() || "",
                  feedback: values[8]?.trim() || "",
                  rating: values[9]?.trim() || "⭐⭐⭐",
                  title: values[1]?.substring(0, 60) || t("recommendedGuides.fallbackTitle"),
                  sheet: sheet.name,
                });
              }
            }
          } catch (sheetError) {
            console.error(`Error loading sheet ${sheet.name}:`, sheetError);
          }
        }

        setGuides(allGuides);
        setError(null);
      } catch (err) {
        console.error("Error loading guides:", err);
        setError(t("recommendedGuides.loadErrorMessage"));
      } finally {
        setLoading(false);
      }
    };

    loadGuides();
  }, []);

  // Filter and search guides
  const filteredGuides = useMemo(() => {
    let result = guides;

    // Sheet filter
    if (sheetFilter !== "all") {
      result = result.filter((guide) => guide.sheet === sheetFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (guide) =>
          guide.title.toLowerCase().includes(query) ||
          guide.description.toLowerCase().includes(query) ||
          guide.technologies.toLowerCase().includes(query) ||
          guide.language.toLowerCase().includes(query) ||
          guide.sheet.toLowerCase().includes(query),
      );
    }

    // Language filter
    if (languageFilter !== "all") {
      result = result.filter((guide) =>
        guide.language.toLowerCase().includes(languageFilter.toLowerCase()),
      );
    }

    // Rating filter
    if (ratingFilter !== "all") {
      const minStars = parseInt(ratingFilter);
      result = result.filter((guide) => {
        const stars = (guide.rating.match(/⭐/g) || []).length;
        return stars >= minStars;
      });
    }

    return result;
  }, [guides, searchQuery, languageFilter, ratingFilter, sheetFilter]);

  // Statistics
  const stats = useMemo(() => {
    const hebrewCount = guides.filter((g) =>
      g.language.toLowerCase().includes("עברית"),
    ).length;
    const englishCount = guides.filter((g) =>
      g.language.toLowerCase().includes("אנגלית"),
    ).length;
    const highRated = guides.filter(
      (g) => (g.rating.match(/⭐/g) || []).length >= 4,
    ).length;

    return {
      total: guides.length,
      hebrew: hebrewCount,
      english: englishCount,
      highRated,
    };
  }, [guides]);

  if (loading) {
    return (
      <div className="recommended-guides-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t("recommendedGuides.loadingGuides")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recommended-guides-page">
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <h2>{t("recommendedGuides.errorTitle")}</h2>
          <p>{error}</p>
          <a
            href="https://docs.google.com/spreadsheets/d/1I8y1bH400KnpkcD1q-gGYjy-uM__i3Xs-MFqc9uJakY/edit?gid=593094152#gid=593094152"
            target="_blank"
            rel="noopener noreferrer"
            className="excel-link-button"
          >
            📊 {t("recommendedGuides.openExcelLink")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="recommended-guides-page">
      <div className="recommended-guides-container">
        {/* Header */}
        <div className="page-header">
          <h1>🎓 {t("recommendedGuides.pageTitle")}</h1>
          <p className="page-subtitle">
            {t("recommendedGuides.pageSubtitle")}
          </p>
          <div className="curator-info">

            <div className="curator-details">
              <strong>{t("recommendedGuides.curatedByLabel")}</strong>
              <p className="curator-tagline">
                {t("recommendedGuides.curatorTagline")}
              </p>

              <a href="mailto:m0534147159@gmail.com" className="curator-email">
                m0534147159@gmail.com |                 053-414-7159

              </a>
       
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="statistics-bar">
          <div className="stat-item">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">{t("recommendedGuides.statTotalLabel")}</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.hebrew}</span>
            <span className="stat-label">{t("recommendedGuides.statHebrewLabel")}</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.english}</span>
            <span className="stat-label">{t("recommendedGuides.statEnglishLabel")}</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.highRated}</span>
            <span className="stat-label">{t("recommendedGuides.statHighRatedLabel")}</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="controls-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder={t("recommendedGuides.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filters-row">
            <div className="filter-group">
              <label>{t("recommendedGuides.categoryLabel")}</label>
              <select
                value={sheetFilter}
                onChange={(e) => setSheetFilter(e.target.value)}
                className="filter-select sheet-filter"
              >
                <option value="all">{t("recommendedGuides.allCategories")}</option>
                {SHEETS.map((sheet) => (
                  <option key={sheet.gid} value={sheet.name}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>{t("recommendedGuides.languageLabel")}</label>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">{t("recommendedGuides.allOption")}</option>
                <option value="עברית">{t("recommendedGuides.languageHebrewOption")}</option>
                <option value="אנגלית">{t("recommendedGuides.languageEnglishOption")}</option>
              </select>
            </div>

            <div className="filter-group">
              <label>{t("recommendedGuides.minRatingLabel")}</label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">{t("recommendedGuides.allOption")}</option>
                <option value="5">{t("recommendedGuides.rating5Option")}</option>
                <option value="4">{t("recommendedGuides.rating4Option")}</option>
                <option value="3">{t("recommendedGuides.rating3Option")}</option>
              </select>
            </div>

            <div className="view-toggle">
              <button
                className={`view-button ${viewMode === "cards" ? "active" : ""}`}
                onClick={() => setViewMode("cards")}
                title={t("recommendedGuides.cardsViewTitle")}
              >
                🎴 {t("recommendedGuides.cardsViewLabel")}
              </button>
              <button
                className={`view-button ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title={t("recommendedGuides.tableViewTitle")}
              >
                📋 {t("recommendedGuides.tableViewLabel")}
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="results-info">
          <p>
            {t("recommendedGuides.resultsShowingPrefix")} <strong>{filteredGuides.length}</strong> {t("recommendedGuides.resultsShowingSuffix")}
            {filteredGuides.length !== stats.total && ` ${t("recommendedGuides.resultsShowingOutOf", { total: stats.total })}`}
          </p>
        </div>

        {/* Guides Display */}
        {filteredGuides.length > 0 ? (
          viewMode === "cards" ? (
            <div className="guides-grid">
              {filteredGuides.map((guide) => (
                <a
                  key={guide.id}
                  href={guide.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="guide-card"
                >
                  <div className="guide-card-header">
                    <span className="guide-rating">{guide.rating}</span>
                    <span className="guide-language">{guide.language}</span>
                  </div>
                  <h3 className="guide-title">{guide.title}</h3>
                  <p className="guide-description">{guide.description}</p>
                  <div className="guide-meta">
                    <span className="guide-duration">⏱️ {guide.duration}</span>
                    <span className="guide-technologies">
                      🔧 {guide.technologies}
                    </span>
                  </div>
                  {guide.feedback && (
                    <div className="guide-feedback">💬 {guide.feedback}</div>
                  )}
                  <div className="guide-card-footer">
                    <span className="guide-link-text">{t("recommendedGuides.learnNowLink")}</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="guides-table-container">
              <table className="guides-table">
                <thead>
                  <tr>
                    <th>{t("recommendedGuides.tableHeaderRating")}</th>
                    <th>{t("recommendedGuides.tableHeaderTitle")}</th>
                    <th>{t("recommendedGuides.tableHeaderLanguage")}</th>
                    <th>{t("recommendedGuides.tableHeaderDuration")}</th>
                    <th>{t("recommendedGuides.tableHeaderTechnologies")}</th>
                    <th>{t("recommendedGuides.tableHeaderAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuides.map((guide) => (
                    <tr key={guide.id}>
                      <td className="rating-cell">{guide.rating}</td>
                      <td className="title-cell">
                        <strong>{guide.title}</strong>
                        <p className="table-description">{guide.description}</p>
                      </td>
                      <td className="language-cell">{guide.language}</td>
                      <td className="duration-cell">{guide.duration}</td>
                      <td className="tech-cell">{guide.technologies}</td>
                      <td className="action-cell">
                        <a
                          href={guide.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="table-link-button"
                        >
                          {t("recommendedGuides.viewGuideLink")}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="no-results">
            <span className="no-results-icon">🔍</span>
            <p>{t("recommendedGuides.noResultsText")}</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setLanguageFilter("all");
                setRatingFilter("all");
              }}
              className="clear-filters-button"
            >
              {t("recommendedGuides.clearFiltersButton")}
            </button>
          </div>
        )}

        {/* Excel Link */}
        <div className="excel-link-section">
          <a
            href="https://docs.google.com/spreadsheets/d/1I8y1bH400KnpkcD1q-gGYjy-uM__i3Xs-MFqc9uJakY/edit?gid=593094152#gid=593094152"
            target="_blank"
            rel="noopener noreferrer"
            className="excel-link-button"
          >
            📊 {t("recommendedGuides.openFullExcelLink")}
          </a>
        </div>
      </div>
    </div>
  );
}
