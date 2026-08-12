import { type FC } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { removeInquiry, setCurrentInquiry } from "./inquiriesSlice";
import type { AppDispatch } from "../../app/store";
import "./InquiriesCard.css";

// טיפוס לפנייה
export interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  createdAt: string;
  screenShots?: string[]; // אופציונלי, מערך תמונות
}

// פרופס של כרטיס פנייה
interface InquiriesCardProps {
  e: Inquiry;
}

const InquiriesCard: FC<InquiriesCardProps> = ({ e }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { name, email, subject, message, status, createdAt, id } = e;

  // ניווט לדף הפרטים
  const goToDetails = (): void => {
    dispatch(setCurrentInquiry(e));
    navigate("/inquiry-details");
  };

  // מחיקת הפנייה
  const handleDelete = (): void => {
    dispatch(removeInquiry(id));
  };

  // ניווט לעדכון פנייה
  const handleUpdate = (): void => {
    dispatch(setCurrentInquiry(e));
    navigate("/inquiry-update");
  };

  return (
    <article className="inquiries-card" aria-labelledby={`inq-${id}-title`}>
      <header className="inquiries-card-header">
        <div>
          <h3 id={`inq-${id}-title`} className="inquiries-card-title">{subject}</h3>
          <div className="inquiries-card-meta">
            <span className="inquiries-card-value">{name}</span>
            <span className="inquiries-card-sep">•</span>
            <span className="inquiries-card-value">{email}</span>
            <span className="inquiries-card-sep">•</span>
            <time className="inquiries-card-time">{createdAt}</time>
          </div>
        </div>

        <span className={`inquiries-status ${status}`} aria-hidden>
          {status === "open" ? "פתוחה" : "סגורה"}
        </span>
      </header>

      <div className="inquiries-card-body">
        <p className="inquiries-card-message"><strong>הודעה:</strong> {message}</p>
      </div>

      <footer className="inquiries-card-footer">
        <button className="btn btn-primary" onClick={goToDetails} aria-label="לפרטים">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>לפרטים</span>
        </button>

        <button className="btn btn-secondary" type="button" onClick={handleUpdate} aria-label="עריכה">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M3 21v-3.75L17.81 2.44a2 2 0 012.82 0l0 0a2 2 0 010 2.82L5.75 20.06H3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>עריכה</span>
        </button>

        <button className="btn btn-danger" type="button" onClick={handleDelete} aria-label="מחיקה">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M3 6h18M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6M10 6V4a2 2 0 012-2h0a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>מחיקה</span>
        </button>
      </footer>
    </article>
  );
};

export default InquiriesCard;

