import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiCall } from "../../config/api"; 

export default function RequestDetails() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<any>(null);

  useEffect(() => {
    // השתמשנו בנתיב המלא כפי שהגדרנו בשרת
    apiCall(`/contact/my-requests/${id}`, { method: "GET" })
      .then((data) => setRequest(data))
      .catch((err) => console.error("שגיאה בטעינת הפנייה:", err));
  }, [id]);

  if (!request) return <div>טוען פרטי פנייה...</div>;

  return (
    <div className="request-details-container">
      <h2>פרטי הפנייה</h2>
      <div className="request-card">
        <h3>{request.title}</h3>
        <p><strong>סוג:</strong> {request.requestType}</p>
        <p><strong>תוכן:</strong> {request.description}</p>
        <p><strong>תאריך שליחה:</strong> {new Date(request.createdAt).toLocaleDateString("he-IL")}</p>
      </div>
    </div>
  );
}