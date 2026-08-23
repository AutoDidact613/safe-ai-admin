import { useSelector, useDispatch } from "react-redux";
import { updateStatus, setCurrentInquiry } from "./inquiriesSlice";
import { useNavigate } from "react-router-dom";
import { useState, type ChangeEvent, type FC } from "react";
import type { AppDispatch } from "../../app/store";
import type { RootState } from "../../app/store";

export interface Attachment {
  url: string;
  file?: File;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  createdAt: string;
  attachments?: Attachment[];
}

const InquiriesDetails: FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const inquiry = useSelector(
    (state: RootState) => state.inquiries.currentInquiry
  ) as Inquiry | null;

  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailBody, setEmailBody] = useState<string>("");

  if (!inquiry) return <p>אין נתונים להצגה</p>;

  const handleSendResponse = (): void => setShowEmailModal(true);

  const handleSendEmail = (): void => {
    console.log("Email sent:", emailBody);
    setShowEmailModal(false);
    setEmailBody("");
  };

  const handleCloseInquiry = (): void => {
    dispatch(updateStatus({ id: inquiry.id, status: "closed" }));
    dispatch(setCurrentInquiry({ ...inquiry, status: "closed" }));
    navigate("/inquiry-list");
  };

  const handleCreateTask = (): void => alert("המשימה נרשמה בהצלחה");

  return (
    <>
      <div className="inquiry-details">
        <h2>פרטי הפנייה</h2>

        <p><strong>שם:</strong> {inquiry.name}</p>
        <p><strong>אימייל:</strong> {inquiry.email}</p>
        <p><strong>נושא:</strong> {inquiry.subject}</p>
        <p><strong>הודעה:</strong> {inquiry.message}</p>
        <p><strong>סטטוס:</strong> {inquiry.status}</p>
        <p><strong>נוצר בתאריך:</strong> {inquiry.createdAt}</p>

        <div className="details-images">
          {inquiry.attachments?.map((a, i) => (
            <img key={i} src={a.url} alt={`attachment ${i}`} />
          ))}
        </div>

        <div className="inquiry-buttons" style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={handleSendResponse}>שלח תגובה</button>
          <button className="btn btn-secondary" onClick={handleCloseInquiry}>סגור פניה</button>
          <button className="btn btn-secondary" onClick={handleCreateTask}>צור משימה</button>
        </div>
      </div>

      {showEmailModal && (
        <div className="email-modal">
          <div className="email-modal-content">
            <h3>שליחת מייל</h3>
            <textarea
              className="email-textarea"
              value={emailBody}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setEmailBody(e.target.value)
              }
              placeholder="הקלד את תוכן המייל..."
            />
            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button className="btn btn-primary" onClick={handleSendEmail}>שלח</button>
              <button className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>
                בטל
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InquiriesDetails;


