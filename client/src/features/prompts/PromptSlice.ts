import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
// ייבוא הטיפוסים (ה-Interfaces) שיצרנו בקובץ types.ts
import type { Prompt , PromptState, Version} from "./types";

// הגדרת הערכים הראשוניים של הסטייט עם הטיפוס שקבענו
const initialState: PromptState = {

    //מערך של פרומפטים
    prompt: [
        {
            id: 1,
            profession: "תכנות",
            purpose: "הפיכת הצאט למקצועי",
            content: "you must to tall only a good and polit language",
            forUse: true,
            createdAt: "2025-12-09",
            versions: [{ 
                VersionId: 1, 
                profession: "תכנות", 
                purpose: "הפיכת הצאט למקצועי", 
                content: "you must to write a clean word", 
                createdAt: "2024-11-09", 
                ReasonReplace: "לא מספיק יעיל" 
            }]
        },
        {
            id: 2,
            profession: "אדריכלות",
            purpose: "הפניה לאתרים רלוונטיים",
            content: "you must to give a good link for what the user ask for you",
            forUse: false,
            createdAt: "2025-11-09",
            versions: []
        }
    ],
    //מערך של מקצועות
    professions: [{ id: 1, prof: "תכנות" }],

    //null פרומפט נוכחי - כרגע 
    currentPrompt: null,

    //null גירסא נוכחית - כרגע 
    currentVersion: null
};

//PayloadAction - מבטח לנו את מה שקיבלנו בפונקציה
//שנקבל רק את הסוג שנגדיר - 
// דוגמא : PayloadAction<Prompt> - יכול לקבל רק אוביקט מסוג פרומפט
//אם ינסו לשלוח משהו שונה מהסוג שהגדרנו - נקבל שגיאה

export const PromtSlice = createSlice({
    name: "prompts",
    initialState,
    reducers: {
        // action: PayloadAction<Prompt> - אומר שהמידע שנשלח (payload) חייב להיות אובייקט מסוג Prompt
        changCurrentP: (state, action: PayloadAction<Prompt>) => {
            state.currentPrompt = action.payload;
        },

        // כאן ה-payload חייב להיות מסוג Version
        changCurrentV: (state, action: PayloadAction<Version>) => {
            state.currentVersion = action.payload;
        },

        // Partial<Prompt> אומר שאנחנו מקבלים אובייקט עם חלק מהשדות של Prompt (למשל בלי ID עדיין)
        addPrompt: (state, action: PayloadAction<Partial<Prompt>>) => {
            const newPromt = action.payload as Prompt;
            // חישוב ID חדש: בודק מה ה-ID האחרון ומוסיף 1
            newPromt.id = state.prompt.length > 0 ? state.prompt[state.prompt.length - 1].id + 1 : 1;
            newPromt.forUse = false;
            newPromt.createdAt = new Date().toISOString(); // המרה לפורמט טקסט תקני
            newPromt.versions = [];
            state.prompt.push(newPromt);
        },

        // כאן ה-payload הוא מספר (ה-ID למחיקה)
        deletePrompt: (state, action: PayloadAction<number>) => {
            const id = action.payload;
            // שימוש ב-filter ליצירת מערך חדש ללא האיבר שנמחק
            state.prompt = state.prompt.filter(p => p.id !== id);
        },

        // עדכון פרומפט - מקבל אובייקט עם הפרומפט וסיבת השינוי
        updateP: (state, action: PayloadAction<{ p: Prompt; reason: string }>) => {
            const { p: promptToUpdate, reason } = action.payload;
            const index = state.prompt.findIndex(p => p.id === promptToUpdate.id);
            
            if (index !== -1) {
                const thisPrompt = state.prompt[index];
                
                if (!promptToUpdate.forUse) {
                    // אם הפרומפט לא מאושר לשימוש, פשוט מעדכנים
                    state.prompt[index] = { ...promptToUpdate, versions: thisPrompt.versions };
                } else {
                    // יצירת גרסה חדשה מהמידע הישן לפני העדכון
                    const newVersion: Version = {
                        VersionId: thisPrompt.versions.length + 1,
                        content: thisPrompt.content,
                        // בדיקה אם התאריך הוא אובייקט או טקסט והמרה לטקסט
                        createdAt: typeof thisPrompt.createdAt === 'string' ? thisPrompt.createdAt : new Date().toISOString(),
                        ReasonReplace: reason
                    };
                    thisPrompt.versions.push(newVersion);
                    state.prompt[index] = { ...promptToUpdate, versions: thisPrompt.versions };
                }
            }
        },

        // אישור פרומפט לשימוש לפי ID
        confirmPrompt: (state, action: PayloadAction<number>) => {
            const id = action.payload;
            const index = state.prompt.findIndex(p => p.id === id);
            if (index !== -1) {
                state.prompt[index].forUse = true;
            }
        },

        // מחיקת גרסה ספציפית
        deletVersion: (state, action: PayloadAction<{ profession: string; purpose: string; versionId: number }>) => {
            const { profession, purpose, versionId } = action.payload;
            const promptIndex = state.prompt.findIndex(
                p => p.profession === profession && p.purpose === purpose
            );
            
            if (promptIndex !== -1) {
                const prompt = state.prompt[promptIndex];
                // סינון המערך כך שהגרסה עם ה-ID הספציפי תוסר
                prompt.versions = prompt.versions.filter(v => v.VersionId !== versionId);
            }
        }
    }
});

// ייצוא הפעולות (Actions)
export const { 
    changCurrentP, 
    changCurrentV, 
    addPrompt, 
    deletePrompt, 
    updateP, 
    confirmPrompt, 
    deletVersion 
} = PromtSlice.actions;

// ייצוא ה-Reducer
export default PromtSlice.reducer;