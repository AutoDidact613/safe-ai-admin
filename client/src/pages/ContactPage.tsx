import { useState, type FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { API_ENDPOINTS, apiCall } from "../config/api";
import "../styles/contact-page.css";

export default function ContactPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [requestType, setRequestType] = useState("כללי"); // ערך ברירת מחדל
  const [contactTypes, setContactTypes] = useState<{ label: string; value: string }[]>([]);
  
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
      setMessage(t("contact.requiresLogin"));
      return;
    }

    if (!title.trim() || !description.trim()) {
      setMessage(t("contact.allFieldsRequired"));
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
            requestType: requestType.trim(),
          }),
        }
      );

      setMessage(response.message || t("contact.successMessage"));
      setTitle("");
      setDescription("");

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("contact.errorSending");
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
          <h1>{t("contact.title")}</h1>
          <div className="login-required">
            <p>{t("contact.requiresLogin")}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/login")}
            >
              {t("contact.loginButton")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contact-page">
      <div className="contact-container">
        <h1>{t("contact.title")}</h1>
        <p className="contact-subtitle">{t("contact.subtitle")}</p>
        <div className="design-partner-banner">
          <div className="design-partner-icon">🤝</div>
          <div className="design-partner-content">
            <h3>{t("contact.partnerBannerTitle")}</h3>
            <p>
              {t("contact.partnerBannerText")}
            </p>
            <p className="design-partner-highlight">
              {t("contact.partnerHighlight")}
            </p>
            <div className="guides-link-section">
              <p>{t("contact.guidesSection")}</p>
              <a
                href="/docs"
                className="guides-link-button"
              >
                {t("contact.guidesDocs")}
              </a>
              <a
                href="https://drive.google.com/drive/folders/1-x8qSkCQRWxfIGyNzjszUW_u3eiggY8b?usp=drive_link"
                target="_blank"
                rel="noopener noreferrer"
                className="guides-link-button secondary"
              >
                {t("contact.guidesDrive")}
              </a>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-group">
            <label htmlFor="title">{t("contact.labelTitle")}</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("contact.titlePlaceholder")}
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
            <label htmlFor="description">{t("contact.labelDescription")}</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("contact.descriptionPlaceholder")}
              rows={8}
              disabled={isSubmitting}
              required
              maxLength={1000}
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
            {isSubmitting ? t("contact.buttonSubmitting") : t("contact.buttonSubmit")}
          </button>
        </form>
      </div>
    </div>
  );
}
