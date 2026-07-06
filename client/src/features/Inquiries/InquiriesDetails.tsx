import { useSelector, useDispatch } from "react-redux";
import { updateStatus, setCurrentInquiry } from "./inquiriesSlice";
import { useNavigate } from "react-router-dom";
import { useState, type ChangeEvent, type FC } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const inquiry = useSelector(
    (state: RootState) => state.inquiries.currentInquiry
  ) as Inquiry | null;

  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [emailBody, setEmailBody] = useState<string>("");

  if (!inquiry) return <p>{t("inquiries.noDataMessage")}</p>;

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

  const handleCreateTask = (): void => alert(t("inquiries.taskCreatedAlert"));

  return (
    <>
      <div className="inquiry-details">
        <h2>{t("inquiries.detailsTitle")}</h2>

        <p><strong>{t("inquiries.nameLabel")}</strong> {inquiry.name}</p>
        <p><strong>{t("inquiries.emailLabel")}</strong> {inquiry.email}</p>
        <p><strong>{t("inquiries.subjectLabel")}</strong> {inquiry.subject}</p>
        <p><strong>{t("inquiries.messageLabel")}</strong> {inquiry.message}</p>
        <p><strong>{t("inquiries.statusLabel")}</strong> {inquiry.status}</p>
        <p><strong>{t("inquiries.createdAtLabel")}</strong> {inquiry.createdAt}</p>

        <div className="details-images">
          {inquiry.attachments?.map((a, i) => (
            <img key={i} src={a.url} alt={`attachment ${i}`} />
          ))}
        </div>

        <div className="inquiry-buttons" style={{ marginTop: 20, display: "flex", gap: 10 }}>
          <button className="btn btn-primary" onClick={handleSendResponse}>{t("inquiries.sendResponseBtn")}</button>
          <button className="btn btn-secondary" onClick={handleCloseInquiry}>{t("inquiries.closeInquiryBtn")}</button>
          <button className="btn btn-secondary" onClick={handleCreateTask}>{t("inquiries.createTaskBtn")}</button>
        </div>
      </div>

      {showEmailModal && (
        <div className="email-modal">
          <div className="email-modal-content">
            <h3>{t("inquiries.sendEmailTitle")}</h3>
            <textarea
              className="email-textarea"
              value={emailBody}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setEmailBody(e.target.value)
              }
              placeholder={t("inquiries.emailBodyPlaceholder")}
            />
            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button className="btn btn-primary" onClick={handleSendEmail}>{t("inquiries.sendBtn")}</button>
              <button className="btn btn-secondary" onClick={() => setShowEmailModal(false)}>
                {t("inquiries.cancelBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InquiriesDetails;


