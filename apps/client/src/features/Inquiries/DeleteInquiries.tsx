import { type FC } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { removeInquiry } from "./inquiriesSlice";
import type { AppDispatch } from "../../app/store";
import type { RootState } from "../../app/store";

// טיפוס לפנייה
interface Inquiry {
  id: string;
  subject: string;
  // הוסיפי כאן שדות נוספים במידת הצורך
}

const DeleteInquiries: FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();

  // בוחרים את הפנייה הנוכחית מתוך ה־store
  const currentInquiry = useSelector(
    (state: RootState) => state.inquiries.currentInquiry
  ) as Inquiry | null;

  // פונקציה למחיקה
  const handleDelete = (): void => {
    if (!currentInquiry) return;

    dispatch(removeInquiry(currentInquiry.id));
    navigate("/inquiry-list");
  };

  // אם אין פנייה נוכחית, מציגים הודעה
  if (!currentInquiry) {
    return <p>אין פנייה למחיקה</p>;
  }

  return (
    <div>
      <h2>מחיקת פנייה</h2>
      <p>האם את בטוחה שברצונך למחוק את הפנייה?</p>

      <p>
        <strong>{currentInquiry.subject}</strong>
      </p>

      <button className="btn btn-danger" onClick={handleDelete}>מחק</button>
    </div>
  );
};

export default DeleteInquiries;

