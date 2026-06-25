import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiCall } from "../../config/api"; 
import { useNavigate } from "react-router-dom";

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // השתמשנו בנתיב המלא כפי שהגדרנו בשרת
    apiCall(`/contact/my-requests/${id}`, { method: "GET" })
      .then((data) => setRequest(data))
      .catch((err) => console.error("שגיאה בטעינת הפנייה:", err));
  }, [id]);

  if (!request) return <div>טוען פרטי פנייה...</div>;

  const handleCloseRequest = async () => {
  try {
    await apiCall(`/contact/my-requests/${id}/close`, { method: "PATCH" });
    
    // עדכון ה-State של ה-request כדי שהסטטוס ישתנה ב-UI באופן מיידי
    setRequest({ ...request, status: 'closed' });
    alert("הפנייה נסגרה בהצלחה!");
    navigate(-1); // נווט חזרה לרשימת הפניות לאחר סגירה
  } catch (error) {
    console.error("שגיאה בסגירת הפנייה:", error);
    alert("שגיאה בסגירת הפנייה. נסי שוב מאוחר יותר.");
  }
};

  return (
    <div className="request-details-container">
      <h2>פרטי הפנייה</h2>
      <div className="request-card">
        <h3>{request.title}</h3>
        <p><strong>סוג:</strong> {request.requestType}</p>
        <p><strong>תוכן:</strong> {request.description}</p>
        <p><strong>תאריך שליחה:</strong> {new Date(request.createdAt).toLocaleDateString("he-IL")}</p>
        <button onClick={handleCloseRequest}>סגור פנייה</button>
      </div>
    </div>
  );
}