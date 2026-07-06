import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();

        useEffect(() => {
        apiCall(`/contact/my-requests/${id}`, { method: "GET" })
            .then((data) => {
                const fetchedData = data as unknown as RequestData;
                setRequest(fetchedData);
            })
            .catch((err) => console.error("שגיאה בטעינת הפנייה:", err));
    }, [id]);


    if (!request) return <div>{t("requests.loadingDetails")}</div>;

    const handleCloseRequest = async () => {
        try {
            await apiCall(`/contact/my-requests/${id}/close`, { method: "PATCH" });

            // עדכון ה-State של ה-request כדי שהסטטוס ישתנה ב-UI באופן מיידי
            setRequest({ ...request, status: 'closed' });
            alert(t("requests.closeSuccessAlert"));
            navigate(-1); // נווט חזרה לרשימת הפניות לאחר סגירה
        } catch (error) {
            console.error("שגיאה בסגירת הפנייה:", error);
            alert(t("requests.closeFailedAlert"));
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
            <h2>{t("inquiries.detailsTitle")}</h2>
            <div className="request-card">
                <h3>{String(request.title || "")}</h3>
                <p><strong>{t("requests.typeLabel")}</strong> {String(request.requestType || "")}</p>
                <p><strong>{t("requests.contentLabel")}</strong> {String(request.description || "")}</p>
                <p><strong>{t("requests.sentDateLabel")}</strong> {request.createdAt ? new Date(request.createdAt as string | number | Date).toLocaleDateString("he-IL") : ""}</p>
                <button onClick={handleCloseRequest}>{t("requests.closeRequestBtn")}</button>

                <div className="replies-list">
                    {(request.replies || []).map((replyItem, index: number) => {
                        const reply = replyItem as Record<string, unknown>;
                        return (
                            <div key={index} className={`reply-bubble ${String(reply.senderRole || "")}`}>
                                <p><strong>{reply.senderRole === 'admin' ? t("requests.adminSenderLabel") : t("requests.meSenderLabel")}:</strong> {String(reply.text || "")}</p>
                                <small>{reply.createdAt ? new Date(reply.createdAt as string | number | Date).toLocaleString("he-IL") : ""}</small>
                            </div>
                        );
                    })}
                </div>

                <div className="reply-section">
                    <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={t("requests.replyPlaceholder")}
                    />
                    <button onClick={handleAddReply} disabled={isSubmitting}>
                        {isSubmitting ? t("forgotPassword.sendingBtn") : t("inquiries.sendResponseBtn")}
                    </button>
                </div>
            </div>
        </div>
    );

}