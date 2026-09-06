interface Props {
  apiKey: string;
  onClose: () => void;
}

export default function NewApiKeyModal({ apiKey, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔑 API Key נוצר בהצלחה!</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: "20px" }}>
          <div style={{ backgroundColor: "var(--color-warning-bg)", border: "1px solid var(--color-warning-border)", borderRadius: "4px", padding: "15px", marginBottom: "20px" }}>
            <strong>⚠️ אזהרה חשובה:</strong>
            <p style={{ margin: "10px 0 0 0" }}>זוהי ההזדמנות היחידה שלך לשמור את המפתח הזה. לא תוכל לראות אותו שוב!</p>
          </div>
          <div className="form-group">
            <label>API Key:</label>
            <textarea
              value={apiKey}
              readOnly
              rows={3}
              style={{ width: "100%", fontFamily: "monospace", fontSize: "14px", backgroundColor: "var(--bg-elevated)", padding: "10px" }}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%" }}
            onClick={() => { navigator.clipboard.writeText(apiKey); alert("המפתח הועתק ללוח!"); }}
          >
            📋 העתק ללוח
          </button>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>סגור</button>
        </div>
      </div>
    </div>
  );
}
