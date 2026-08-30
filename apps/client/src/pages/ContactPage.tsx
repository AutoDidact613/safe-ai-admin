import { useState, type FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS, apiCall } from "../config/api";
import { useScreenCapture } from "../hooks/useScreenCapture";
import "../styles/contact-page.css";

const MAX_ATTACHMENTS = 5;

interface CapturedAttachment {
  id: string;
  file: File;
  previewUrl: string;
  type: "image" | "video";
}

export default function ContactPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [requestType, setRequestType] = useState("כללי"); // ערך ברירת מחדל
  const [contactTypes, setContactTypes] = useState<{ label: string; value: string }[]>([]);

  const [attachments, setAttachments] = useState<CapturedAttachment[]>([]);
  const attachmentLimitReached = attachments.length >= MAX_ATTACHMENTS;

  const addCapturedAttachment = (file: File, type: "image" | "video") => {
    setAttachments((prev) => {
      if (prev.length >= MAX_ATTACHMENTS) return prev;
      return [
        ...prev,
        { id: `${Date.now()}-${prev.length}`, file, type, previewUrl: URL.createObjectURL(file) },
      ];
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => {
      const toRemove = prev.find((a) => a.id === id);
      if (toRemove) URL.revokeObjectURL(toRemove.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const clearAttachments = () => {
    setAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.previewUrl));
      return [];
    });
  };

  // Called whenever a recording finishes, whether stopped via our own
  // button or via the browser's own "stop sharing" control. `file` is null
  // if the recording came out empty (see useScreenCapture for why that can
  // happen) - surface that instead of silently doing nothing.
  const { isSupported: isCaptureSupported, isRecording, captureScreenshot, startRecording, stopRecording } =
    useScreenCapture((file) => {
      if (file) addCapturedAttachment(file, "video");
      else setMessage("ההקלטה יצאה ריקה. נסה שוב, ועדיף לוודא שהטאב הזה נשאר פתוח וגלוי תוך כדי ההקלטה.");
    });

  const handleScreenshotClick = async () => {
    try {
      const file = await captureScreenshot();
      if (file) addCapturedAttachment(file, "image");
    } catch (err) {
      console.error("Error capturing screenshot:", err);
      setMessage("שגיאה בצילום המסך. נסה שוב.");
    }
  };

  const handleRecordingClick = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    try {
      await startRecording();
    } catch (err) {
      console.error("Error starting screen recording:", err);
      setMessage("שגיאה בהתחלת הקלטת המסך. נסה שוב.");
    }
  };

  // הוספת useEffect לטעינת הנתונים מהשרת
useEffect(() => {
  const fetchTypes = async () => {
    try {
      const response = await apiCall<{ data: {label: string, value: string}[] }>(API_ENDPOINTS.contactTypes);
      setContactTypes(response.data);
    } catch (e) {
      console.error("Failed to load types", e);
    }
  };
  fetchTypes();
}, []);
  
  // Check if user is logged in
  const accessToken = localStorage.getItem("accessToken");
  const user = localStorage.getItem("user");
  const isLoggedIn = !!(accessToken && user);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

     if (!isLoggedIn) {
       setMessage("עליך להתחבר כדי לשלוח הודעה");
       return;
     }

    if (!title.trim() || !description.trim()) {
      setMessage("נא למלא את כל השדות");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      // Upload every captured screenshot/recording directly to S3 first
      // (same get-url + PUT pattern as AddPostModal.tsx, one per file, run
      // concurrently), then send only the resulting file URLs alongside
      // the rest of the form.
      const uploadedAttachments = await Promise.all(
        attachments.map(async ({ file, type }) => {
          const urlResponse = await fetch(API_ENDPOINTS.upload.getUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileName: file.name, fileType: file.type }),
          });
          if (!urlResponse.ok) throw new Error("נכשלה קבלת קישור מאובטח מהשרת");
          const { uploadUrl, fileUrl } = await urlResponse.json();

          const s3Response = await fetch(uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!s3Response.ok) throw new Error("העלאת קובץ מצורף נכשלה");
          return { url: fileUrl, type };
        }),
      );

      // Send contact form to backend
      const response = await apiCall<{ success: boolean; message: string }>(
        API_ENDPOINTS.contact,
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            requestType: requestType.trim(),
            ...(uploadedAttachments.length ? { attachments: uploadedAttachments } : {}),
          }),
        }
      );

      setMessage(response.message || "ההודעה נשלחה בהצלחה!");
      setTitle("");
      setDescription("");
      clearAttachments();

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "אירעה שגיאה בשליחת ההודעה. נסה שוב.";
      setMessage(errorMessage);
      console.error("Error sending message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="contact-page">
        <div className="contact-container">
          <h1>צור קשר</h1>
          <div className="login-required">
            <p>עליך להתחבר כדי לשלוח הודעה</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/login")}
            >
              התחבר
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-page">
      <div className="contact-container">
        <h1>צור קשר</h1>
        <p className="contact-subtitle">שלח לנו הודעה ונחזור אליך בהקדם</p>

        {/* Design Partner Message */}
        <div className="design-partner-banner">
          <div className="design-partner-icon">🤝</div>
          <div className="design-partner-content">
            <h3>אתם  שותפי העיצוב  שלנו!</h3>
            <p>
              המערכת נמצאת בשלב הרצה ניסיונית (Beta) ומתעדכנת כל שבוע.<br/> 
              המשוב שלכם חיוני לנו ומאפשר לנו לעצב מערכת מקצועית וטובה יותר.<br/>
              כל הערה, רעיון או בעיה שתשתפו איתנו - <br />יתקבלו בברכה ויעזרו לנו לשפר את החוויה עבורכם ועבור כל המשתמשים.
            </p>
            <p className="design-partner-highlight">
              💡 תודה שאתם חלק מהמסע שלנו לבניית פתרון AI בטוח ומתקדם!
            </p>
            <div className="guides-link-section">
              <p>זקוקים לעזרה? בקרו במרכז המדריכים שלנו:</p>
              <a
                href="/docs"
                className="guides-link-button"
              >
                📚 מדריכי שימוש
              </a>
              <a
                href="https://drive.google.com/drive/folders/1-x8qSkCQRWxfIGyNzjszUW_u3eiggY8b?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className="guides-link-button secondary"
              >
                📂 תיקיית המדריכים בדרייב
              </a>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-group">
            <label htmlFor="title">כותרת</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="נושא ההודעה"
              disabled={isSubmitting}
              required
              maxLength={100}
            />
          </div>
          <div className="form-group">
        <label htmlFor="requestType">סוג הפנייה</label>
        <select
  id="requestType"
  value={requestType}
  onChange={(e) => setRequestType(e.target.value)}
  disabled={isSubmitting}
  required
>
  <option value="" hidden>בחר סוג פנייה</option>
  {contactTypes.map((t) => (
    <option key={t.value} value={t.value}>{t.label}</option>
  ))}
</select>
        </div>

              <div className="form-group">
            <label htmlFor="description">תיאור</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="פרט את הודעתך כאן..."
              rows={8}
              disabled={isSubmitting}
              required
              maxLength={1000}
            />
          </div>

          {isCaptureSupported && (
            <div className="form-group">
              <label>{`צירופים (אופציונלי, עד ${MAX_ATTACHMENTS} קבצים)`}</label>
              <div className="screen-capture-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleScreenshotClick}
                  disabled={isSubmitting || isRecording || attachmentLimitReached}
                >
                  צילום מסך
                </button>
                <button
                  type="button"
                  className={`btn ${isRecording ? "btn-danger" : "btn-secondary"}`}
                  onClick={handleRecordingClick}
                  disabled={isSubmitting || (attachmentLimitReached && !isRecording)}
                >
                  {isRecording ? "עצור הקלטה" : "הקלטת מסך"}
                </button>
              </div>
              <small className="capture-hint">
                {attachmentLimitReached
                  ? `הגעת למספר המרבי של ${MAX_ATTACHMENTS} צירופים. אפשר להסיר אחד כדי לצרף עוד.`
                  : 'כדי שגם השמע יוקלט, יש לסמן את תיבת "שיתוף אודיו" בחלונית הבחירה של הדפדפן'}
              </small>

              {attachments.length > 0 && (
                <div className="attachment-preview-list">
                  {attachments.map((att) => (
                    <div key={att.id} className="attachment-preview">
                      {att.type === "image" ? (
                        <img src={att.previewUrl} alt="תצוגה מקדימה של צילום המסך" />
                      ) : (
                        <video src={att.previewUrl} controls />
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary attachment-remove-btn"
                        onClick={() => handleRemoveAttachment(att.id)}
                        disabled={isSubmitting}
                      >
                        הסר צירוף
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {message && (
            <div className={`message ${message.includes("שגיאה") ? "error" : "success"}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "שולח..." : "שלח הודעה"}
          </button>
        </form>
      </div>
    </div>
  );
}
