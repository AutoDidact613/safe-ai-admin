import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import React from 'react';
import { changCurrentP } from "../PromptSlice";
import type { Prompt } from "../types";

// הגדרת מה בדיוק הקומפוננטה מקבלת
interface PromptCardProps {
    //p - חייב להיות אוביקט מסוג פרומפט
    p: Prompt; 
}

const PromptCard: React.FC<PromptCardProps> = ({ p }) => {
// const PromptCard = ({ p }: PromptCardProps) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const toDetails = () => {
        dispatch(changCurrentP(p));
        navigate("/promptDetails");
    };

    const { profession, purpose } = p;
    
    return (
        <div className="card">
            <p>מקצוע : {profession}</p>
            <p>מטרה : {purpose}</p>
            <button onClick={toDetails}>פרטים</button>
        </div>
    );
};

export default PromptCard;

