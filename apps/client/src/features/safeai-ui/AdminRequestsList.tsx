import { useState, useEffect } from "react";
import { apiCall, API_ENDPOINTS } from "../../config/api";
import { useNavigate } from "react-router-dom";

type Reply = {
  senderRole: string;
};

type RequestUser = {
  _id?: string;
  name?: string;
  email?: string;
};

type Request = {
  _id: string;
  userId?: RequestUser | string;
  title?: string;
  status: string;
  replies?: Reply[];
};

type AgentInquiry = {
  id: string;
  title: string;
  urgency?: string;
};

type AgentRunListResult = {
  thread_id: string;
  inquiries: AgentInquiry[];
};

type AgentDraftResult = {
  inquiry_id: string;
  text: string;
  guardrails_passed: boolean | null;
  guardrails_reasons: string[];
};

type AgentProcessResult = {
  thread_id: string;
  drafts: AgentDraftResult[];
};

type AgentApproveResult = {
  thread_id: string;
  sent_ids: string[];
};

// Local, editable view of one drafted reply. `text` tracks the textarea as
// the admin types; `savedText` is the last value actually persisted via
// /run/edit (or the original draft) - the two diverge while an edit hasn't
// been saved yet, which is also what gates the "select to send" checkbox.
type DraftItem = {
  inquiryId: string;
  text: string;
  savedText: string;
  guardrailsPassed: boolean | null;
  guardrailsReasons: string[];
  selectedForApproval: boolean;
  savingEdit: boolean;
};

export default function AdminRequestsList() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(null);
  const [triggeringAgent, setTriggeringAgent] = useState(false);
  const [agentResultMessage, setAgentResultMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // SCRUM-262: gates 3-6 of the inquiry-agent flow (selection -> draft ->
  // edit/approve -> send), mirroring what run_agent.py's CLI already does.
  const [agentThreadId, setAgentThreadId] = useState<string | null>(null);
  const [agentInquiries, setAgentInquiries] = useState<AgentInquiry[]>([]);
  const [selectedInquiryIds, setSelectedInquiryIds] = useState<Set<string>>(new Set());
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [sending, setSending] = useState(false);
  const [sendResultMessage, setSendResultMessage] = useState<string | null>(null);

  const handleTriggerAgent = async () => {
    setTriggeringAgent(true);
    setAgentResultMessage(null);
    try {
      const result = await apiCall<AgentRunListResult>(API_ENDPOINTS.inquiryAgent.runList, {
        method: "POST",
      });
      setAgentThreadId(result.thread_id);
      setAgentInquiries(result.inquiries);
      setSelectedInquiryIds(new Set());
      setDrafts([]);
      setDraftError(null);
      setSendResultMessage(null);
      setAgentResultMessage(
        `סוכן ה-AI סיווג ${result.inquiries.length} פניות פתוחות (thread-id: ${result.thread_id})`,
      );
    } catch (err) {
      console.error("שגיאה בהפעלת סוכן ה-AI:", err);
      setAgentResultMessage(
        err instanceof Error ? `שגיאה בהפעלת סוכן ה-AI: ${err.message}` : "שגיאה בהפעלת סוכן ה-AI",
      );
    } finally {
      setTriggeringAgent(false);
    }
  };

  const toggleInquirySelection = (id: string) => {
    setSelectedInquiryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDraftSelected = async () => {
    if (!agentThreadId || selectedInquiryIds.size === 0) return;

    setDrafting(true);
    setDraftError(null);
    setSendResultMessage(null);
    try {
      const result = await apiCall<AgentProcessResult>(API_ENDPOINTS.inquiryAgent.runProcess, {
        method: "POST",
        body: JSON.stringify({ threadId: agentThreadId, ids: Array.from(selectedInquiryIds) }),
      });

      setDrafts(
        result.drafts.map((d) => ({
          inquiryId: d.inquiry_id,
          text: d.text,
          savedText: d.text,
          guardrailsPassed: d.guardrails_passed,
          guardrailsReasons: d.guardrails_reasons,
          // Nothing is pre-selected for sending, even a draft that passed
          // guardrails - the admin reviews and opts each one in explicitly.
          selectedForApproval: false,
          savingEdit: false,
        })),
      );
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "שגיאה בניסוח הטיוטות");
    } finally {
      setDrafting(false);
    }
  };

  const handleDraftTextChange = (inquiryId: string, text: string) => {
    setDrafts((prev) => prev.map((d) => (d.inquiryId === inquiryId ? { ...d, text } : d)));
  };

  const handleSaveEdit = async (inquiryId: string) => {
    if (!agentThreadId) return;
    const draft = drafts.find((d) => d.inquiryId === inquiryId);
    if (!draft || draft.text === draft.savedText) return;

    setDrafts((prev) =>
      prev.map((d) => (d.inquiryId === inquiryId ? { ...d, savingEdit: true } : d)),
    );
    try {
      await apiCall(API_ENDPOINTS.inquiryAgent.runEdit, {
        method: "POST",
        body: JSON.stringify({ threadId: agentThreadId, inquiryId, text: draft.text }),
      });
      setDrafts((prev) =>
        prev.map((d) =>
          d.inquiryId === inquiryId ? { ...d, savedText: d.text, savingEdit: false } : d,
        ),
      );
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "שגיאה בשמירת העריכה");
      setDrafts((prev) =>
        prev.map((d) => (d.inquiryId === inquiryId ? { ...d, savingEdit: false } : d)),
      );
    }
  };

  const toggleApprovalSelection = (inquiryId: string) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.inquiryId === inquiryId ? { ...d, selectedForApproval: !d.selectedForApproval } : d,
      ),
    );
  };

  const handleApproveSelected = async () => {
    if (!agentThreadId) return;
    const idsToSend = drafts.filter((d) => d.selectedForApproval).map((d) => d.inquiryId);
    if (idsToSend.length === 0) return;

    setSending(true);
    setSendResultMessage(null);
    try {
      const result = await apiCall<AgentApproveResult>(API_ENDPOINTS.inquiryAgent.runApprove, {
        method: "POST",
        body: JSON.stringify({ threadId: agentThreadId, ids: idsToSend }),
      });

      setSendResultMessage(`נשלחו תשובות לפניות: ${result.sent_ids.join(", ")}`);
      setDrafts((prev) => prev.filter((d) => !result.sent_ids.includes(d.inquiryId)));
      setSelectedInquiryIds((prev) => {
        const next = new Set(prev);
        result.sent_ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch (err) {
      setSendResultMessage(
        err instanceof Error ? `שגיאה בשליחה: ${err.message}` : "שגיאה בשליחה",
      );
    } finally {
      setSending(false);
    }
  };

  const isRequestNew = (req: Request) => {
    const hasAdminReply = req.replies?.some((reply: Reply) => reply.senderRole === "admin");
    return req.status === "open" && !hasAdminReply;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("האם למחוק את הפנייה הזו לצמיתות?")) return;

    try {
      setDeletingRequestId(id);
      await apiCall(`${API_ENDPOINTS.contact}/${id}`, { method: "DELETE" });
      setRequests((prev) => prev.filter((req) => req._id !== id));
    } catch (err) {
      console.error("שגיאה במחיקת הפנייה:", err);
      alert("לא הצלחנו למחוק את הפנייה. נסה שוב.");
    } finally {
      setDeletingRequestId(null);
    }
  };

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiCall<Request[]>(API_ENDPOINTS.allRequests, { method: "GET" });
        setRequests(data || []);
      } catch (err) {
        console.error("שגיאה בטעינה:", err);
        setError("לא הצלחנו לטעון את כל הפניות. נסה שוב מאוחר יותר.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const agentInquirySelection = agentInquiries.length > 0 && (
    <div className="agent-inquiry-selection">
      <p>בחרי אילו פניות לנסח עבורן טיוטת תשובה:</p>
      <ul className="agent-inquiry-checklist">
        {agentInquiries.map((inquiry) => (
          <li key={inquiry.id}>
            <label title={`#${inquiry.id}`}>
              <input
                type="checkbox"
                checked={selectedInquiryIds.has(inquiry.id)}
                onChange={() => toggleInquirySelection(inquiry.id)}
              />
              <span className={`urgency-badge urgency-${inquiry.urgency ?? "normal"}`}>
                {inquiry.urgency ?? "?"}
              </span>
              {inquiry.title}
            </label>
          </li>
        ))}
      </ul>
      <button
        className="btn btn-primary"
        onClick={handleDraftSelected}
        disabled={selectedInquiryIds.size === 0 || drafting}
      >
        {drafting ? "מנסח טיוטות... (יכול לקחת כמה דקות, בעיקר עם כמה פניות בבת אחת)" : "נסח טיוטות"}
      </button>
      {draftError && <p className="error">{draftError}</p>}
    </div>
  );

  const agentDraftsReview = drafts.length > 0 && (
    <div className="agent-drafts-review">
      <h3>טיוטות לבדיקה ואישור</h3>
      {drafts.map((draft) => {
        const hasUnsavedEdit = draft.text !== draft.savedText;
        return (
          <div key={draft.inquiryId} className="agent-draft-card">
            <div className="agent-draft-header">
              <strong>{`פנייה #${draft.inquiryId}`}</strong>
              <span
                className={
                  draft.guardrailsPassed === false
                    ? "guardrails-badge guardrails-failed"
                    : "guardrails-badge guardrails-passed"
                }
              >
                {draft.guardrailsPassed === false ? "לא עבר guardrails" : "עבר guardrails"}
              </span>
            </div>
            {draft.guardrailsReasons.length > 0 && (
              <p className="guardrails-reasons">{draft.guardrailsReasons.join("; ")}</p>
            )}
            <textarea
              className="agent-draft-textarea"
              value={draft.text}
              onChange={(e) => handleDraftTextChange(draft.inquiryId, e.target.value)}
              rows={6}
            />
            <div className="agent-draft-actions">
              <button
                className="btn btn-secondary"
                onClick={() => handleSaveEdit(draft.inquiryId)}
                disabled={!hasUnsavedEdit || draft.savingEdit}
              >
                {draft.savingEdit ? "שומר..." : "שמור עריכה"}
              </button>
              <label className="agent-draft-approve-label">
                <input
                  type="checkbox"
                  checked={draft.selectedForApproval}
                  disabled={hasUnsavedEdit}
                  onChange={() => toggleApprovalSelection(draft.inquiryId)}
                />
                לשליחה
              </label>
              {hasUnsavedEdit && (
                <span className="agent-draft-hint">יש לשמור את השינוי לפני בחירה לשליחה</span>
              )}
            </div>
          </div>
        );
      })}
      <button
        className="btn btn-primary"
        onClick={handleApproveSelected}
        disabled={!drafts.some((d) => d.selectedForApproval) || sending}
      >
        {sending ? "שולח..." : "אשר ושלח את הנבחרים"}
      </button>
      {sendResultMessage && <p className="agent-trigger-message">{sendResultMessage}</p>}
    </div>
  );

  const triggerButton = (
    <div className="agent-trigger-section">
      <button className="btn btn-primary" onClick={handleTriggerAgent} disabled={triggeringAgent}>
        {triggeringAgent ? "מפעיל את סוכן ה-AI..." : "הפעל את סוכן ה-AI"}
      </button>
      {agentResultMessage && <p className="agent-trigger-message">{agentResultMessage}</p>}
      {agentInquirySelection}
      {agentDraftsReview}
    </div>
  );

  if (loading) {
    return (
      <div className="admin-requests-container">
        <h2>כל הפניות במערכת (מצב מנהל)</h2>
        {triggerButton}
        <p>טוען פניות...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-requests-container">
        <h2>כל הפניות במערכת (מצב מנהל)</h2>
        {triggerButton}
        <p className="error">{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-requests-container">
      <h2>כל הפניות במערכת (מצב מנהל)</h2>
      {triggerButton}
      {requests.length === 0 ? (
        <p>אין פניות כרגע.</p>
      ) : (
        <table className="requests-table">
          <thead>
            <tr>
              <th></th>
              <th>משתמש</th>
              <th>דואר אלקטרוני</th>
              <th>נושא</th>
              <th>סטטוס</th>
              <th>מחק</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => {
              const newBadge = isRequestNew(req);
              const needsAdminAttention = req.status === "open" && (!req.replies || req.replies.length === 0 || req.replies[req.replies.length - 1].senderRole === "user");
              const userInfo = typeof req.userId === "object" ? req.userId : undefined;
              return (
                <tr key={req._id}>
                  <td>
                    {needsAdminAttention && (
                      <span className="request-new-badge request-new-icon">תגובה חדשה</span>
                    )}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {userInfo?.name || "לא ידוע"}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {userInfo?.email || "אין"}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {req.title || "ללא נושא"}
                  </td>
                  <td onClick={() => navigate(`/request/${req._id}`)} style={{ cursor: "pointer" }}>
                    {req.status === "closed" ? "נסגרה" : "פתוחה"}
                    {newBadge && <span className="request-new-badge">חדש</span>}
                  </td>
                  <td>
                    <button
                      className="delete-request-btn"
                      onClick={() => handleDelete(req._id)}
                      disabled={deletingRequestId === req._id}
                      title="מחק פנייה"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 6L18.3333 19.3333C18.3333 20.0512 17.7386 20.6458 17.0208 20.6458H6.97917C6.26126 20.6458 5.66667 20.0512 5.66667 19.3333L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 6V4.33333C8 3.61542 8.59459 3.02083 9.3125 3.02083H14.6875C15.4054 3.02083 16 3.61542 16 4.33333V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
