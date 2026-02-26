import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../../../app/store";
import PromptCard from "../components/PromptCard";
import type { Prompt } from '../types';

const PromptList = () => {
    const navigate = useNavigate();

    // שליפת המערך מהסטייט עם הגדרת הטיפוס RootState
    const prompt = useSelector((state: RootState) => state.prompts.prompt);

    const toAddPrompt = () => {
        navigate("/addPrompt");
    };

    return (
        <div className="div1">
            <h3>פרומפטים מאושרים</h3>

            <div className="promt">
                {prompt
                    .filter((p : Prompt ) => p.forUse === true)
                    .map((p : Prompt ) => (
                        <PromptCard key={p.id} p={p} />
                    ))}
            </div>

            <button onClick={toAddPrompt}>הוסף פרומפט</button>

            <h3>הצעות לפרומפטים</h3>
            <div className="promt">
                {prompt
                    .filter((p : Prompt )=> p.forUse === false)
                    .map((p : Prompt ) => (
                        <PromptCard key={p.id} p={p} />
                    ))}
            </div>
        </div>
    );
};

export default PromptList;
