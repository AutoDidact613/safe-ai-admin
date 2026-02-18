// features/FilterManagement/GroupPromptsPage.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks'; // שים לב לנתיב!
import { changePromptStatus, removePrompt } from './FilterManagementSlice';

const GroupPromptsPage: React.FC = () => {
    const groupPrompts = useAppSelector(state => state.filterManagement.groupPrompts);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [search, setSearch] = useState("");

    const filteredPrompts = groupPrompts.filter(p =>
        p.content.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="prompt-container" style={{ padding: '20px' }}>
            <div>
                <h1>ניהול פרומפטים</h1>
                <div style={{ marginBottom: '20px' }}>
                    <input
                        placeholder="חפש פרומפט ברשימה..."
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ padding: '8px', marginLeft: '10px' }}
                    />
                    
                    {/* כפתור הוספה - שולח לדף הוספה (ניתוב יחסי) */}
                    <button 
                        type='button' 
                        onClick={() => navigate('add-prompt')}
                        className="btn btn-primary"
                    >
                        הוסף פרומפט חדש
                    </button>
                </div>

                <ul className="prompt-list" style={{ listStyle: 'none', padding: 0 }}>
                    {filteredPrompts.map((prompt) => (
                        <li key={prompt.id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{prompt.content} <strong>({prompt.Status})</strong></span>
                            <div>
                                <button onClick={() => navigate(`edit-prompt/${prompt.id}`)} style={{ marginLeft: '5px' }}>ערוך</button>
                                <button onClick={() => dispatch(removePrompt(prompt.id))} style={{ marginLeft: '5px', backgroundColor: '#ff4d4f', color: 'white' }}>הסר</button>
                                <button onClick={() => dispatch(changePromptStatus(prompt.id))}>השהה</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default GroupPromptsPage;