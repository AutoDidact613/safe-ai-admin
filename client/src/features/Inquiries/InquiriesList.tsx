import { useState, useMemo, type FC } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCurrentInquiry, type Inquiry} from "./inquiriesSlice";
import type { RootState } from "../../app/store";
import type { AppDispatch } from "../../app/store";

import "./inquiries.css";

const timeAgo = (isoDate?: string): string => {
  if (!isoDate) return "";
  const then = new Date(isoDate);
  const diff = Date.now() - then.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day >= 365) return `לפני ${Math.floor(day / 365)} שנים`;
  if (day >= 30) return `לפני ${Math.floor(day / 30)} חודשים`;
  if (day > 0) return `לפני ${day} ימים`;
  if (hr > 0) return `לפני ${hr} שעות`;
  if (min > 0) return `לפני ${min} דקות`;
  return `לפני מספר שניות`;
};

interface CompactItemProps {
  inquiry: Inquiry;
  onDetails: (inquiry: Inquiry) => void;
}

const CompactItem: FC<CompactItemProps> = ({ inquiry, onDetails }) => (
    <div className="inquiry-compact">
    <div className="inquiry-compact-main">
      <div className="inquiry-subject">{inquiry.subject}</div>
      <div
        className="inquiry-status"
        style={{ fontWeight: "bold", color: inquiry.status === "open" ? "green" : "red" }}
      >
        {inquiry.status === "open" ? "פתוחה" : "סגורה"}
      </div>
      <div className="inquiry-time">{timeAgo(inquiry.createdAt)}</div>
    </div>
    <div className="inquiry-actions">
      <button className="btn btn-primary" onClick={() => onDetails(inquiry)}>לפרטים</button>
    </div>
  </div>
);

const InquiriesList: FC = () => {
  const inquiries = useSelector((state: RootState) => state.inquiries.inquiries) as Inquiry[];
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

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
      <h2>רשימת פניות</h2>
      <button className="btn btn-primary inquiry-add-btn" onClick={() => navigate("/inquiry-add")}>הוספת פנייה חדשה</button>

      <div className="filters-card">
        <div className="filters-row">
          <label>מתאריך</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />

          <label>עד תאריך</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />

          <input
            className="filters-search"
            type="text"
            placeholder="טקסט לחיפוש (שם, נושא או הודעה)"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={notHandledOnly}
              onChange={e => setNotHandledOnly(e.target.checked)}
            />
            לא טופלו בלבד
          </label>

          <div className="filter-buttons">
            <button className="btn btn-primary" onClick={applyFilter}>סנן</button>
            <button className="btn btn-secondary" onClick={resetFilters} type="button">איפוס</button>
          </div>
        </div>
      </div>

      <div className="results-header">{displayList.length} תוצאות</div>

      <div className="inquiries-list">
        {displayList.length === 0 ? (
          <p>לא נמצאו פניות לפי הסינון</p>
        ) : (
          displayList.map(inq => <CompactItem key={inq.id} inquiry={inq} onDetails={goToDetails} />)
        )}
      </div>
    </div>
  );
};

export default InquiriesList;