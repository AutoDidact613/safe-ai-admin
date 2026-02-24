import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../../../app/store";

const VersionDetails = () => {
    const navigate = useNavigate();

    // 1. שליפת הגרסה הנוכחית מהסטייט
    const currenV = useSelector((state: RootState) => state.prompts.currentVersion);

    // 2. בדיקת בטיחות: אם אין גרסה נבחרת (למשל אחרי רענון דף)
    if (!currenV) {
        return (
            <div className="v-details">
                <p>לא נבחרה גרסה להצגה</p>
                <button onClick={() => navigate("/promptList")}>חזרה לרשימה</button>
            </div>
        );
    }

    return (
        <div className="v-details">
            <h2>פרטי גרסה מספר {currenV.VersionId}</h2>
            
            <p><strong>תוכן הגרסה:</strong></p>
            <div className="content-box">
                {currenV.content}
            </div>

            <p><strong>סיבת ההחלפה:</strong> {currenV.ReasonReplace}</p>
            <p><strong>תאריך יצירה:</strong> {currenV.createdAt}</p>

            <button onClick={() => navigate(-1)}>חזרה לפרומפט</button>
        </div>
    );
};

export default VersionDetails;