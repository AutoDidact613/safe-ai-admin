import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { updateInquiry, type Attachment, type Inquiry } from "./inquiriesSlice";
import type { RootState } from "../../app/store";
import type { AppDispatch } from "../../app/store";
import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";

const UpdateInquiries: React.FC = () => {
  const currentInquiry = useSelector(
    (state: RootState) => state.inquiries.currentInquiry
  ) as Inquiry | null;

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [name, setName] = useState<string>(currentInquiry?.name || "");
  const [email, setEmail] = useState<string>(currentInquiry?.email || "");
  const [subject, setSubject] = useState<string>(currentInquiry?.subject || "");
  const [message, setMessage] = useState<string>(currentInquiry?.message || "");
  const [attachments, setAttachments] = useState<Attachment[]>(currentInquiry?.attachments || []);

  const handleFiles = (files: FileList | null): void => {
    if (!files) return;
    const arr: Attachment[] = Array.from(files).map(f => ({ url: URL.createObjectURL(f), file: f }));
    setAttachments(prev => [...prev, ...arr]);
  };

  const update = (): void => {
    if (!currentInquiry) return;

    if (!name.trim() || !subject.trim() || !message.trim()) {
      alert(t("inquiries.requiredFieldsAlert"));
      return;
    }

    const updated: Inquiry = {
      ...currentInquiry,
      name,
      email,
      subject,
      message,
      attachments,
    };

    dispatch(updateInquiry(updated));
    navigate("/inquiry-list");
  };

  if (!currentInquiry) return <p>{t("inquiries.noInquiryToEdit")}</p>;

  return (
    <div>
      <h2>{t("inquiries.editTitle")}</h2>
      <form onSubmit={(e) => { e.preventDefault(); update(); }}>
        <input type="text" placeholder="Name" value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
        <br />
        <input type="email" placeholder="Email" value={email} onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
        <br />
        <input type="text" placeholder="Subject" value={subject} onChange={(e: ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)} />
        <br />
        <textarea placeholder="Message" value={message} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)} />
        <br />
        <input type="file" accept="image/*" multiple onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)} />
        <br />
        <div>
          {attachments.map((a, i) => <img key={i} src={a.url} width={120} alt={`attachment ${i}`} />)}
        </div>
        <button type="submit" className="btn btn-primary">{t("inquiries.updateBtn")}</button>
      </form>
    </div>
  );
};

export default UpdateInquiries;

