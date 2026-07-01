import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiCall } from "../../config/api";

interface RequestData {
    title?: unknown; requestType?: unknown; description?: unknown; createdAt?: unknown; replies?: unknown[]; status?: unknown;
}


export default function RequestDetails() {
    const { id } = useParams<{ id: string }>();
    const [request, setRequest] = useState<RequestData | null>(null);
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
            setRequest((data as unknown as { request: RequestData }).request);
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
                <h3>{String(request.title || "")}</h3>
                <p><strong>סוג:</strong> {String(request.requestType || "")}</p>
                <p><strong>תוכן:</strong> {String(request.description || "")}</p>
                <p><strong>תאריך שליחה:</strong> {request.createdAt ? new Date(request.createdAt as string | number | Date).toLocaleDateString("he-IL") : ""}</p>
                <button onClick={handleCloseRequest}>סגור פנייה</button>

                <div className="replies-list">
                    {(request.replies || []).map((replyItem, index: number) => {
                        const reply = replyItem as Record<string, unknown>;
                        return (
                            <div key={index} className={`reply-bubble ${String(reply.senderRole || "")}`}>
                                <p><strong>{reply.senderRole === 'admin' ? 'אדמין' : 'אני'}:</strong> {String(reply.text || "")}</p>
                                <small>{reply.createdAt ? new Date(reply.createdAt as string | number | Date).toLocaleString("he-IL") : ""}</small>
                            </div>
                        );
                    })}
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