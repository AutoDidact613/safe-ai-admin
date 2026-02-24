import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import React from 'react';
import type { Version } from "../types";
import { changCurrentV } from "../PromptSlice";


interface VersionCardProps {
    v: Version; // v חייב להיות מסוג Version
}

const VersionCard: React.FC<VersionCardProps> = ({ v }) => {
// const VersionCard = ({ v }: VersionCardProps) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const toDetails = () => {
        dispatch(changCurrentV(v));
        navigate("/VersionDetails");
    };

    const { VersionId, ReasonReplace } = v;

    return (
        <div className="cardV">
            <p>גירסא : {VersionId}</p>
            <p>סיבת השינוי : {ReasonReplace}</p>
            <button onClick={toDetails}>פרטים</button>
        </div>
    );
};

export default VersionCard;