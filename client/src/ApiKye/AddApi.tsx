import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { addApi } from "./ApiSlice";

interface AddApiProps {
  onClose: () => void;
}

export const AddApi: React.FC<AddApiProps> = ({ onClose }) => {
  const [apiName, setApiName] = useState<string>("");
  const [apiAddress, setApiAddress] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const dispatch = useDispatch();

  const generateRandomKey = (): string =>
    Math.random().toString(36).substring(2, 15) +
    "-" +
    Math.random().toString(36).substring(2, 15);

  const handleCreate = () => {
    if (!apiName.trim()) {
      alert("אנא הכנס שם API");
      return;
    }

    const newApiAddress = `https://myapi.com/${apiName
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
    const newApiKey = generateRandomKey();

    const newApi = {
      id: 0, // יעדכן בסלייס
      name: apiName,
      key: newApiKey,
      apiAddress: newApiAddress,
      userId: 1,
      useDitails: [],
    };

    dispatch(addApi(newApi));
    setApiAddress(newApiAddress);
    setApiKey(newApiKey);
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard
        .writeText(apiKey)
        .then(() => setCopied(true))
        .catch(() => alert("העתקה נכשלה, אנא העתקי ידנית"));
    }
  };

  if (apiAddress) {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <h3>ה-API שלך נוצר בהצלחה!</h3>
          <p>המפתח שלך:</p>
          <div style={apiBoxStyle}>{apiKey}</div>

          <button onClick={copyToClipboard}>
            {copied ? "הועתק!" : "העתק מפתח"}
          </button>

          {!copied && (
            <p style={{ color: "red", marginTop: 10 }}>
              חשוב! יש להעתיק את המפתח כעת, אחרת הוא יימחק לאחר סגירת החלון.
            </p>
          )}

          <button
            onClick={() => {
              if (!copied) {
                alert("אנא העתקי את המפתח לפני הסגירה!");
              } else {
                onClose();
              }
            }}
            style={{ marginTop: 10, width: "100%" }}
            className="back-btn"
          >
            סגור
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>צור API חדשה</h3>
        <input
          placeholder="הכנס שם API"
          value={apiName}
          onChange={(e) => setApiName(e.target.value)}
        />
        <div className="modal-buttons" style={{ marginTop: 20 }}>
          <button onClick={handleCreate}>המשך</button>
          <button onClick={onClose} className="cancel-btn">
            בטל
          </button>
        </div>
      </div>
    </div>
  );
};

const apiBoxStyle: React.CSSProperties = {
  backgroundColor: "#f5f5f5",
  border: "2px solid #007bff",
  borderRadius: 6,
  padding: 15,
  wordBreak: "break-all",
  fontFamily: "monospace",
  fontSize: 14,
  marginBottom: 15,
  userSelect: "all",
  display: "flex",
};
