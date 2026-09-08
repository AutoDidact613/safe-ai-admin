import { useState, useMemo, type FC } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { setCurrentInquiry, type Inquiry} from "./inquiriesSlice";
import type { RootState } from "../../app/store";
import type { AppDispatch } from "../../app/store";

import "./inquiries.css";

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const timeAgo = (isoDate: string | undefined, t: TFunc): string => {
  if (!isoDate) return "";
  const then = new Date(isoDate);
  const diff = Date.now() - then.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day >= 365) return t("inquiries.timeAgo.years", { count: Math.floor(day / 365) });
  if (day >= 30) return t("inquiries.timeAgo.months", { count: Math.floor(day / 30) });
  if (day > 0) return t("inquiries.timeAgo.days", { count: day });
  if (hr > 0) return t("inquiries.timeAgo.hours", { count: hr });
  if (min > 0) return t("inquiries.timeAgo.minutes", { count: min });
  return t("inquiries.timeAgo.secondsAgo");
};

interface CompactItemProps {
  inquiry: Inquiry;
  onDetails: (inquiry: Inquiry) => void;
}

const CompactItem: FC<CompactItemProps> = ({ inquiry, onDetails }) => {
  const { t } = useTranslation();
  return (
    <div className="inquiry-compact">
    <div className="inquiry-compact-main">
      <div className="inquiry-subject">{inquiry.subject}</div>
      <div
        className="inquiry-status"
        style={{ fontWeight: "bold", color: inquiry.status === "open" ? "var(--color-success)" : "var(--color-danger)" }}
      >
        {inquiry.status === "open" ? t("inquiries.statusOpen") : t("inquiries.statusClosed")}
      </div>
      <div className="inquiry-time">{timeAgo(inquiry.createdAt, t)}</div>
    </div>
    <div className="inquiry-actions">
      <button className="btn btn-primary" onClick={() => onDetails(inquiry)}>{t("inquiries.details")}</button>
    </div>
  </div>
  );
};

const InquiriesList: FC = () => {
  const inquiries = useSelector((state: RootState) => state.inquiries.inquiries) as Inquiry[];
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // סטייט רק עבור ערכי הסינון
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchText, setSearchText] = useState("");
  const [notHandledOnly, setNotHandledOnly] = useState(false);
  
  // משתנה עזר כדי להפעיל את הסינון רק כשלוחצים על הכפתור
  const [filterTrigger, setFilterTrigger] = useState(0);

  // חישוב הרשימה להצגה
  const displayList = useMemo(() => {
    let res = [...(inquiries || [])];

    if (notHandledOnly) res = res.filter(i => i.status === "open");

    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      res = res.filter(i =>
        i.subject.toLowerCase().includes(q) ||
        i.message.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q)
      );
    }

    if (fromDate) res = res.filter(i => new Date(i.createdAt) >= new Date(fromDate));
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      res = res.filter(i => new Date(i.createdAt) <= to);
    }

    res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res;
    
    // הוספנו כאן את כל המשתנים שה-Linter ביקש:
  }, [inquiries, filterTrigger, fromDate, toDate, searchText, notHandledOnly]);
  const applyFilter = (): void => {
    setFilterTrigger(prev => prev + 1);
  };

  const resetFilters = (): void => {
    setFromDate(""); setToDate(""); setSearchText(""); setNotHandledOnly(false);
    setFilterTrigger(prev => prev + 1);
  };

  const goToDetails = (inquiry: Inquiry): void => {
    dispatch(setCurrentInquiry(inquiry));
    navigate("/inquiry-details");
  };

  return (
    <div>
      <h2>{t("inquiries.title")}</h2>
      <button className="btn btn-primary inquiry-add-btn" onClick={() => navigate("/inquiry-add")}>{t("inquiries.addNew")}</button>

      <div className="filters-card">
        <div className="filters-row">
          <label>{t("inquiries.fromDate")}</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />

          <label>{t("inquiries.toDate")}</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />

          <input
            className="filters-search"
            type="text"
            placeholder={t("inquiries.searchPlaceholder")}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={notHandledOnly}
              onChange={e => setNotHandledOnly(e.target.checked)}
            />
            {t("inquiries.notHandledOnly")}
          </label>

          <div className="filter-buttons">
            <button className="btn btn-primary" onClick={applyFilter}>{t("inquiries.filterBtn")}</button>
            <button className="btn btn-secondary" onClick={resetFilters} type="button">{t("inquiries.resetBtn")}</button>
          </div>
        </div>
      </div>

      <div className="results-header">{t("inquiries.resultsCount", { count: displayList.length })}</div>

      <div className="inquiries-list">
        {displayList.length === 0 ? (
          <p>{t("inquiries.noResults")}</p>
        ) : (
          displayList.map(inq => <CompactItem key={inq.id} inquiry={inq} onDetails={goToDetails} />)
        )}
      </div>
    </div>
  );
};

export default InquiriesList;