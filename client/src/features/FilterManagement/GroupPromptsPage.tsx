

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { changePromptStatus, removePrompt } from './FilterManagementSlice';

const GroupPromptsPage: React.FC = () => {
    const { t } = useTranslation();
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
                <h1>{t("filterManagement.managePromptsTitle")}</h1>
                <div style={{ marginBottom: '20px' }}>
                    <input
                        placeholder={t("filterManagement.searchPromptPlaceholder")}
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
                        {t("filterManagement.addNewPromptBtn")}
                    </button>
                </div>

                <ul className="prompt-list" style={{ listStyle: 'none', padding: 0 }}>
                    {filteredPrompts.map((prompt) => (
                        <li key={prompt.id} style={{ border: '1px solid #ccc', margin: '10px 0', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{prompt.content} <strong>({prompt.Status})</strong></span>
                            <div>
                                <button onClick={() => navigate(`edit-prompt/${prompt.id}`)} style={{ marginLeft: '5px' }}>{t("common.edit")}</button>
                                <button onClick={() => dispatch(removePrompt(prompt.id))} style={{ marginLeft: '5px', backgroundColor: '#ff4d4f', color: 'white' }}>{t("filterManagement.removeBtn")}</button>
                                <button onClick={() => dispatch(changePromptStatus(prompt.id))}>{t("filterManagement.pauseBtn")}</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default GroupPromptsPage;