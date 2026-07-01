import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiCall } from "../../config/api";

export default function RequestDetails() {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<Record<string, unknown> | null>(null);
    const navigate = useNavigate();
    const [replyText, setReplyText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleAddReply = async () => {
        if (!replyText.trim()) return;
        setIsSubmitting(true);
        try {
            const data = await apiCall(`/contact/my-requests/${id}/reply`, {
                method: "POST",
                body: JSON.stringify({ text: replyText }),
            });
            // עדכון ה-UI עם המידע החדש מהשרת
            setRequest(data.request);
            setReplyText("");
        } catch (err) {
            console.error("שגיאה בשליחת התגובה:", err);
        } finally {
            setIsSubmitting(false);
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

                <div className="replies-list">
                    {((request.replies || []) as Record<string, unknown>[]).map((reply, index) => (
                        <div key={index} className={`reply-bubble ${reply.senderRole}`}>
                            <p><strong>{reply.senderRole === 'admin' ? 'אדמין' : 'אני'}:</strong> {reply.text}</p>
                            <small>{new Date(reply.createdAt).toLocaleString("he-IL")}</small>
                        </div>
                    ))}
                </div>

                <div className="reply-section">
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="כתוב תגובה..."
                    />
                    <button onClick={handleAddReply} disabled={isSubmitting}>
                        {isSubmitting ? "שולח..." : "שלח תגובה"}
                    </button>
                </div>
            </div>
        </div>
    );
}