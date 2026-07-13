import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS, apiCall } from "../config/api";
import "../styles/contact-page.css";

export default function ContactPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

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
      // Send contact form to backend
      const response = await apiCall<{ success: boolean; message: string }>(
        API_ENDPOINTS.contact,
        {
          method: "POST",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
          }),
        }
      );

      setMessage(response.message || "ההודעה נשלחה בהצלחה!");
      setTitle("");
      setDescription("");

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
            />
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
            />
          </div>

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
