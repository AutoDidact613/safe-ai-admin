import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { approvePrompt } from './FilterManagementSlice';
import { useNavigate } from 'react-router-dom';

const AddPromptPage = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
 
    const [type, setType] = useState('free'); 
    const [freeText, setFreeText] = useState('');
    const [selectedPromptId, setSelectedPromptId] = useState('');
    
    const addPromptsList = useAppSelector((state: any) => state.filterManagement.addPrompts);

    const handleSubmit = (e: any) => {
        e.preventDefault();
        
        if (type === "free") {
            if (!freeText) return alert("אנא כתוב תוכן");
            
            // כאן המחשב לא יבדוק טיפוסים, הוא פשוט יסמוך עלייך
            const newPrompt = {
                id: Date.now(), 
                groupId: "new",
                content: freeText,
                Status: "active"
            };
            dispatch(approvePrompt(newPrompt as any)); // as any = תשתוק ותקבל את זה
            alert("הפרומפט נוסף בהצלחה");
            navigate(-1); 
        } 
        else if (type === "list") {
            const promptToAdd = addPromptsList.find((p: any) => p.id === parseInt(selectedPromptId));
            if (promptToAdd) {
                dispatch(approvePrompt(promptToAdd));
                alert("הפרומפט נוסף בהצלחה");
                navigate(-1);
            } else {
                alert("בחר פרומפט תקין מהרשימה");
            }
        }
    };

    return (
        <div className="prompt-container" style={{ padding: '20px' }}>
            <h2>הוספת פרומפט חדש</h2>
            
            <div style={{ marginBottom: '20px' }}>
                <button type="button" onClick={() => setType("free")} style={{ marginLeft: '10px' }}>הקלד חופשי</button>
                <button type="button" onClick={() => setType("list")}>חפש מרשימה</button>
            </div>

            {type === "free" && (
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '10px' }}>
                        <label>תוכן הפרומפט: </label>
                        <input 
                            type="text" 
                            value={freeText} 
                            onChange={(e) => setFreeText(e.target.value)} 
                        />
                    </div>
                    <button type="submit">הוסף</button>
                </form>
            )}

            {type === "list" && (
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '10px' }}>
                        <label>בחר פרומפט: </label>
                        <select 
                            value={selectedPromptId} 
                            onChange={(e) => setSelectedPromptId(e.target.value)}
                        >
                            <option value="">-- בחר --</option>
                            {addPromptsList.map((prompt: any) => (
                                <option key={prompt.id} value={prompt.id}>
                                    {prompt.content}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="submit">הוסף</button>
                </form>
            )}
            
            <button onClick={() => navigate(-1)} style={{ marginTop: '20px' }}>ביטול וחזרה</button>
        </div>
    );
};

export default AddPromptPage;