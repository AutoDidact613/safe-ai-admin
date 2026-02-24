import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../../../app/store";
import { deletePrompt } from "../PromptSlice";

const DeleteConfirmation = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // 1. שליפת הפרומפט הנוכחי שסימנו למחיקה
    const currenP = useSelector((state: RootState) => state.prompts.currentPrompt);

    // 2. בדיקת בטיחות: מוודאים שיש מה למחוק
    if (!currenP) {
        return <p>לא נבחר פרומפט למחיקה</p>;
    }

    const handleDelete = () => {
        // 3. שליחת ה-ID בלבד לפונקציית המחיקה
        // TypeScript יודע ש-deletePrompt מצפה למספר (number)
        dispatch(deletePrompt(currenP.id));
        navigate("/promptList");
    };

    return (
        <div className="delete-conf">
            <h2>האם את בטוחה שברצונך למחוק?</h2>
            <p>הפרומפט של המקצוע: <strong>{currenP.profession}</strong> יימחק לצמיתות.</p>
            
            <div className="bDiv">
                <button onClick={handleDelete} className="danger-btn">כן, מחק</button>
                <button onClick={() => navigate(-1)}>ביטול</button>
            </div>
        </div>
    );
};

export default DeleteConfirmation;