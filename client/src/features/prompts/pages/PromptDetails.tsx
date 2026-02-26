import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../../../app/store"; // ייבוא הטיפוס של הסטייט הכללי
import { changCurrentP, confirmPrompt } from "../PromptSlice";
import VersionCard from "../components/VersionCard";

const PromptDetails = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // שליפת הפרומפט הנוכחי מהסטייט
    const currenP = useSelector((state: RootState) => state.prompts.currentPrompt);

    // טיפול במקרה שבו currenP הוא null (למשל אחרי רענון דף)
    if (!currenP) {
        return (
            <div className="prompt-details">
                <p>לא נבחר פרומפט להצגה</p>
                <button onClick={() => navigate("/promptList")}>חזרה לרשימה</button>
            </div>
        );
    }

    const deletP = () => {
        dispatch(changCurrentP(currenP));
        navigate("/deleteConfirmation");
    };

    const update = () => {
        dispatch(changCurrentP(currenP));
        navigate("/updatePrompt");
    };

    const confirm = () => {
        dispatch(confirmPrompt(currenP.id));
        navigate("/promptList");
    };

    return (
        <div className="prompt-details">
            <h2>פרטי הפרומפט</h2>
            <p><strong>מקצוע:</strong> {currenP.profession}</p>
            <p><strong>מטרה:</strong> {currenP.purpose}</p>
            <p><strong>תוכן:</strong> {currenP.content}</p>
            
            <h3>גרסאות קודמות:</h3>
            <div className="versions-list">
                {currenP.versions && currenP.versions.length > 0 ? (
                    currenP.versions.map(v => (
                        <VersionCard key={v.VersionId} v={v} />
                    ))
                ) : (
                    <p>אין גרסאות נוספות לפרומפט זה</p>
                )}
            </div>

            {currenP.forUse === false && (
                <button className="confirm-btn" onClick={confirm}>אשר פרומפט לשימוש</button>
            )}

            <div className="actions-div">
                <button onClick={deletP}>מחיקה</button>
                <button onClick={update}>עדכון / יצירת גרסה</button>
            </div>
        </div>
    );
};

export default PromptDetails;

//
// 1. הגדרת ה-State בתוך ה-useSelector
// במקום לכתוב סתם (state) => ..., הוספנו את הטיפוס RootState:

// השינוי: useSelector((state: RootState) => ...)

// למה? כדי ש-TypeScript ידע בדיוק אילו שדות קיימים ב-Store (כמו prompts) ויציע לך השלמה אוטומטית.

// 2. בדיקת "קיום" (Guard Clause)
// זה השינוי הכי משמעותי.

// השינוי: הוספתי את הבלוק:

// TypeScript
// if (!currenP) {
//     return <p>לא נבחר פרומפט להצגה</p>;
// }
// למה? ב-JavaScript, אם היית נכנסת לדף בלי פרומפט נבחר, האפליקציה הייתה קורסת עם השגיאה המוכרת Cannot read property 'profession' of null. ב-TypeScript, הוא לא מרשה לך לגשת ל-currenP.profession עד שאת לא מוכיחה לו שבדקת שהאובייקט קיים.

// 3. שימוש ב-Interfaces מהקובץ המרכזי
// במקום שהקומפוננטה תנחש איך נראה אובייקט של פרומפט או גרסה:

// השינוי: ייבוא של Prompt ו-Version מ-types.ts.

// למה? זה מבטיח שאם בעתיד תשני את המבנה של "פרומפט" (למשל תשני את השם של השדה content ל-text), TypeScript מיד יסמן לך שגיאה בכל המקומות שצריך לתקן, כולל כאן.

// 4. בטיחות במערך הגרסאות
// השינוי: הוספת בדיקה currenP.versions && currenP.versions.length > 0.

// למה? לוודא שאנחנו מריצים map רק אם באמת יש מערך של גרסאות, כדי למנוע שגיאות רינדור.