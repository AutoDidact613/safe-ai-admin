import { useState } from "react"; // ייבוא ריאקט וה-useState
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../../../app/store"; // ייבוא הטיפוס של הסטייט הכללי
import { updateP } from "../PromptSlice"; // ייבוא הפעולה של העדכון
 
const UpdatePrompt = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // 1. שליפת הפרומפט הנוכחי שנבחר לעדכון
    const currenP = useSelector((state: RootState) => state.prompts.currentPrompt);

    // 2. סטייט מקומי לניהול השדות בטופס וסיבת השינוי
    // שימי לב: אנחנו מאתחלים את השדות עם הערכים הקיימים של הפרומפט
    const [updatedContent, setUpdatedContent] = useState(currenP?.content || "");
    const [reason, setReason] = useState("");

    // 3. בדיקת בטיחות: אם בטעות הגענו לדף ואין פרומפט נבחר
    if (!currenP) {
        return <p>שגיאה: לא נבחר פרומפט לעדכון</p>;
    }

    const handleSave = () => {
        if (!reason) {
            alert("חובה להזין סיבת שינוי ליצירת גרסה חדשה");
            return;
        }

        // 4. יצירת אובייקט מעודכן המבוסס על הקיים
        const pToUpdate = { ...currenP, content: updatedContent };

        // 5. שליחה ל-Redux (ה-Payload כולל את האובייקט ואת הסיבה)
        dispatch(updateP({ p: pToUpdate, reason: reason }));
        navigate("/promptList");
    };

    return (
        <div className="update-prompt">
            <h2>עדכון פרומפט</h2>
            <p><strong>מקצוע:</strong> {currenP.profession}</p>
            <p><strong>מטרה:</strong> {currenP.purpose}</p>

            <label>תוכן חדש:</label>
            <textarea 
                value={updatedContent} 
                onChange={(e) => setUpdatedContent(e.target.value)} 
            />

            <label>סיבת השינוי (עבור הגרסה):</label>
            <input 
                type="text" 
                value={reason} 
                onChange={(e) => setReason(e.target.value)} 
                placeholder="למה החלפת את התוכן?"
            />

            <button onClick={handleSave}>עדכן וצור גרסה</button>
        </div>
    );
};

export default UpdatePrompt;