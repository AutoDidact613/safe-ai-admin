import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";


export interface Prompt {
    id: number;
    groupId: string;
    content: string;
    Status: "active" | "not active";
}

export interface FilterManagementState {
    groupPrompts: Prompt[];
    addPrompts: Prompt[];
}


const initialState: FilterManagementState = {
    groupPrompts: [
        { id: 1, groupId: "123", content: "נטפרי לא מרשה לי", Status: "active" },
        { id: 2, groupId: "223", content: "תוכן לא ראוי", Status: "active" },
        { id: 3, groupId: "323", content: "יש לך עוד משהו אתה צריך עזרה?", Status: "not active" }
    ],
    addPrompts: [
        { id: 4, groupId: "432", content: "תיתן רק דוגמא אחת", Status: "active" },
        { id: 5, groupId: "532", content: "איני יכול לענות לך", Status: "active" },
        { id: 6, groupId: "632", content: "ששששש שב בשקט ותתמקד", Status: "active" }
    ],
};

export const filterManagementSlice = createSlice({
    name: 'filterManagement',
    initialState,
    reducers: {
        promptAdded: (state, action: PayloadAction<Prompt>) => {
            state.addPrompts.push(action.payload);
        },
        promptUpdated: (state, action: PayloadAction<Prompt>) => {
            const updatedPrompt = action.payload;
            const index = state.groupPrompts.findIndex(prompt => prompt.id === updatedPrompt.id);
            if (index !== -1) {
                state.groupPrompts[index] = updatedPrompt;
            }
        },
        changePromptStatus: (state, action: PayloadAction<number>) => {
            const id = action.payload;
            const prompt = state.groupPrompts.find(p => p.id === id);
            if (prompt && prompt.Status === "active") {
                prompt.Status = "not active";
                alert("הפרומפט הושהה בהצלחה");
            } else {
                alert("הפרומפט לא פעיל כבר או לא נמצא");
            }
        },
        removePrompt: (state, action: PayloadAction<number>) => {
            const id = action.payload;
            state.groupPrompts = state.groupPrompts.filter(p => p.id !== id);
        },
        approvePrompt: (state, action: PayloadAction<Prompt>) => {
            const approvedPrompt = action.payload;
            state.groupPrompts.push(approvedPrompt);
            state.addPrompts = state.addPrompts.filter(p => p.id !== approvedPrompt.id);
        },
    }
});

export const {
    promptAdded,
    promptUpdated,
    changePromptStatus,
    removePrompt,
    approvePrompt
} = filterManagementSlice.actions;

export default filterManagementSlice.reducer;