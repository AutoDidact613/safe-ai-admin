import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { updateApi, deleteApi } from "./ApiSlice";
import "./ApiStyles.css";

// הגדרת טיפוס ApiItem כולל השדה apiAddress
interface UseDetail {
  day: string;
  tokensUsed: number;
}

interface ApiItem {
  id: number;
  name: string;
  key: string;
  apiAddress?: string;  // הוספתי את השדה apiAddress כאופציונלי
  userId: number;
  useDitails: UseDetail[];
}

interface ApiCardProps {
  api: ApiItem;
}

export const ApiCard: React.FC<ApiCardProps> = ({ api }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [name, setName] = useState(api.name);
  const [key, setKey] = useState(api.key);
  const [apiAddress, setApiAddress] = useState(api.apiAddress || "");

  // פתיחה וסגירת מודל עריכה
  const openEditModal = () => setIsEditModalOpen(true);
  const closeEditModal = () => {
    setName(api.name);
    setKey(api.key);
    setApiAddress(api.apiAddress || "");
    setIsEditModalOpen(false);
  };

  // שמירת עריכה
  const saveChanges = () => {
    if (!name.trim()) {
      alert("שם API לא יכול להיות ריק");
      return;
    }

    dispatch(updateApi({ 
      id: api.id, 
      name, 
      key, 
      apiAddress, 
      userId: api.userId,
      useDitails: api.useDitails
    }));
    setIsEditModalOpen(false);
  };

  // פתיחה וסגירת מודל מחיקה
  const openDeleteModal = () => setIsDeleteModalOpen(true);
  const closeDeleteModal = () => setIsDeleteModalOpen(false);

  const deleteApiClick = () => {
    dispatch(deleteApi(api.id));
    setIsDeleteModalOpen(false);
  };

  return (
    <>
      {/* כרטיס ה־API */}
      <div className="api-card">
        <h4>{api.name}</h4>
        <p>Key: {api.key}</p>

        <div className="api-card-buttons">
          <button onClick={openEditModal}>ערוך</button>
          <button onClick={() => navigate(`/api-details/${api.id}`)}>פרטי שימוש</button>
          <button onClick={openDeleteModal} className="delete-btn">מחק API keys </button>
        </div>
      </div>

      {/* חלון עריכה */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>עריכת API</h3>

            <label>שם API:</label>
            <input
              style={{ width: "100%", marginBottom: "10px" }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label>כתובת API:</label>
            <input
              style={{ width: "100%", marginBottom: "10px" }}
              value={apiAddress}
              onChange={(e) => setApiAddress(e.target.value)}
            />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={closeEditModal} style={{ width: "45%" }}>
                ביטול
              </button>
              <button onClick={saveChanges} style={{ width: "45%" }}>
                שמור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* חלון מחיקה */}
      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: "center" }}>
            <h3>אזהרה!</h3>
            <p>אתה עומד למחוק את ה־API הזה. פעולה זו בלתי הפיכה.</p>

            <p style={{ fontWeight: "bold" }}>Key:</p>
            <div className="code-box">
              {api.key}
            </div>

            <div className="modal-buttons">
              <button onClick={closeDeleteModal} className="cancel-btn">
                ביטול
              </button>
              <button
                onClick={deleteApiClick}
                className="delete-btn"
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
