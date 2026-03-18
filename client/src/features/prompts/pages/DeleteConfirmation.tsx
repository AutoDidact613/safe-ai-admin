import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../../../app/store";
import { deletePrompt } from "../PromptSlice";

const DeleteConfirmation = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // פה אנחנו שולפים את הפרטמפט שלחצנו עליו למחיקה
    const currenP = useSelector((state: RootState) => state.prompts.currentPrompt);

    if (!currenP) {
        return <p>לא נבחר פרומפט למחיקה</p>;
    }

    //הפונ הזאת שולחת את האיידי של האוביקט לפונקצית שבסלייס
    const deleteFunc = () => {     
        dispatch(deletePrompt(currenP.id));
        navigate("/promptList");
    };

    return (
        <div className="delete-conf">
            <h2>האם את בטוחה שברצונך למחוק?</h2>
            <p>פרומפט זה ימחק לצמיתות</p>
            
            <div className="bDiv">
                <button onClick={deleteFunc} className="danger-btn">כן, מחק</button>
                <button onClick={() => navigate(-1)}>ביטול</button>
            </div>
        </div>
    );
};

export default DeleteConfirmation;