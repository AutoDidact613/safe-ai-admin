import { useState, type ChangeEvent,  } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { addInquiry } from "./inquiriesSlice";
import type { AppDispatch } from "../../app/store";

interface Attachment {
  url: string;
  file: File;
}

interface NewInquiry {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachments: Attachment[];
  status: "open" | "closed";
  createdAt: string;
}

const AddInquiries: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const handleFiles = (files: FileList | null): void => {
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));

    // מוסיף את הקבצים החדשים לרשימה הקיימת במקום להחליף
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const add = (): void => {
    if (!name || !email || !subject || !message) {
      alert("Please fill all required fields!");
      return;
    }

    const newInquiry: NewInquiry = {
      name,
      email,
      subject,
      message,
      attachments,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    dispatch(addInquiry(newInquiry));
    navigate("/inquiry-list");
  };

  return (
    <div>
      <h2>הוספת פנייה חדשה</h2>
      <form>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
        />
        <br />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
        />
        <br />

        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
        />
        <br />

        <textarea
          placeholder="Message"
          value={message}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
        />
        <br />

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)}
        />
        <br />

        <div>
          {attachments.map((a, i) => (
            <img key={i} src={a.url} width={120} alt={`attachment ${i}`} />
          ))}
        </div>

        <button type="button" className="btn btn-primary" onClick={add}>
          הוספת פנייה
        </button>
      </form>
    </div>
  );
};

export default AddInquiries;

