import { useState } from "react"; // ייבוא ריאקט וה-useState
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../../../app/store"; // ייבוא הטיפוס של הסטייט הכללי
import { updateP } from "../PromptSlice"; // ייבוא הפעולה של העדכון
 
const UpdatePrompt = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    //הפורמפט שנבחר לעדכון 
    const currenP = useSelector((state: RootState) => state.prompts.currentPrompt);

    // משתני סטייט של תוכן הפרומפט וסיבת השינוי
    const [updatedContent, setUpdatedContent] = useState(currenP?.content || "");
    const [reason, setReason] = useState("");

    //בדיקת בטיחות: אם בטעות הגענו לדף ואין פרומפט נבחר
    if (!currenP) {
        return <p>שגיאה: לא נבחר פרומפט לעדכון</p>;
    }

    const SaveP = () => {
        if (!reason) {
            alert("חובה להזין סיבת שינוי ליצירת גרסה חדשה");
            return;
        }

        // יצירת אובייקט מעודכן המבוסס על הקיים
        const pToUpdate = { ...currenP, content: updatedContent };

        //שליחה ל-Redux
        // את הפרומפט ואת הסיבה
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

            <button onClick={SaveP}>עדכן וצור גרסה</button>
        </div>
    );
};

export default UpdatePrompt;