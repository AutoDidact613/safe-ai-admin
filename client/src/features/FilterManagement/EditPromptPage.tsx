import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { promptUpdated } from './FilterManagementSlice';

const EditPromptPage = () => {
    const { id } = useParams();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    // שימוש ב-any כדי למנוע אדום
    const prompt = useAppSelector((state: any) =>
        state.filterManagement.groupPrompts.find((p: any) => p.id === parseInt(id || "0"))
    );

    const [groupId, setGroupId] = useState("");
    const [content, setContent] = useState("");
    const [status, setStatus] = useState("active");

    useEffect(() => {
        if (prompt) {
            setGroupId(prompt.groupId);
            setContent(prompt.content);
            setStatus(prompt.Status);
        }
    }, [prompt]);

    if (!prompt) return <div>הפרומפט לא נמצא!</div>;

    const handleSubmit = (e: any) => {
        e.preventDefault();

        const updatedPrompt = {
            id: prompt.id,
            groupId,
            content,
            Status: status
        };
        
        dispatch(promptUpdated(updatedPrompt as any));
        navigate(-1);
    };

    return (
        <div className="prompt-container" style={{ padding: '20px' }}>
            <h2>עריכת פרומפט</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '10px' }}>
                    <label>Group ID: </label>
                    <input type="text" value={groupId} onChange={(e) => setGroupId(e.target.value)} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Content: </label>
                    <input type="text" value={content} onChange={(e) => setContent(e.target.value)} />
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <label>Status: </label>
                    <select 
                        value={status} 
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="active">פעיל</option>
                        <option value="not active">לא פעיל</option>
                    </select>
                </div>
                <button type="submit">שמור שינויים</button>
                <button type="button" onClick={() => navigate(-1)} style={{ marginLeft: '10px' }}>ביטול</button>
            </form>
        </div>
    );
};

export default EditPromptPage;