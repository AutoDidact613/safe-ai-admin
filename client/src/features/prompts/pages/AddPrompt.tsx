import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import React from 'react';
import type { RootState } from "../../../app/store"; //יבאנו פה את ה'מפה' של הסטור שהגדרנו
import { addPrompt } from "../PromptSlice";

const AddPrompt = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    
    // שליפת רשימת המקצועות מהסטייט
    const professions = useSelector((state: RootState) => state.prompts.professions);

    // הגדרת הסטייט המקומי של הטופס
    const [newP, setNewP] = useState({
        profession: "",
        purpose: "",
        content: ""
    });

    // פונקציית עדכון שדות - שימי לב להגדרת ה-Event
    //     מה זה e? זה האובייקט של האירוע (Event).
    // מה זה React.ChangeEvent? זה טיפוס שמגדיר שזהו אירוע של "שינוי".
    // מה זה <HTMLInputElement | HTMLSelectElement>? כאן אנחנו אומרים ל-TypeScript: "האירוע הזה מגיע או מתיבת טקסט (input) או מרשימה נפתחת (select)".
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewP({ ...newP, [name]: value });
    };

    const save = () => {
        // בדיקה בסיסית שהשדות לא ריקים
        if (newP.profession && newP.purpose && newP.content) {
            dispatch(addPrompt(newP));
            navigate("/promptList");
        } else {
            alert("נא למלא את כל השדות");
        }
    };

    return (
        <div className="add-prompt">
            <h2>הוספת פרומפט חדש</h2>
            
            <select name="profession" onChange={handleChange}>
                <option value="">בחר מקצוע</option>
                {professions.map(p => (
                    <option key={p.id} value={p.prof}>{p.prof}</option>
                ))}
            </select>

            <input 
                name="purpose" 
                placeholder="מטרה" 
                onChange={handleChange} 
            />

            <input 
                name="content" 
                placeholder="תוכן הפרומפט" 
                onChange={handleChange} 
            />

            <button onClick={save}>שמור</button>
        </div>
    );
};

export default AddPrompt;
