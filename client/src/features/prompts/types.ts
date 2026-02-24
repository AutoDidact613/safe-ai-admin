// הגדרת מבנה גירסא
//  שדה עם סימן שאלה מייצג שדה שניתן להשאיר ריק
export interface Version {
    VersionId: number;
    profession?: string;
    purpose?: string;
    content: string;
    createdAt: string;
    ReasonReplace: string;
}

// הגדרת מבנה פרומפט
export interface Prompt {
    id: number;
    profession: string;
    purpose: string;
    content: string;
    forUse: boolean;
    createdAt: string | Date; // יכול להיות או תאריך או מחרוזת
    versions: Version[]; // מערך של גירסאות
}

// אנחנו מגדירים אלו משתנים יהיו בסטייט
// בעצם מה יהיו המשתנים של הפרויקט שלנו 
// עוד לא הגדרנו את הסטייט באמת - רק הגדרנו את המבנה שלו
export interface PromptState {
    // מערך של פרומפטים
    prompt: Prompt[]; 

    // מערך של מקצועות - כל אוביקט של מקצוע מכיל קוד של המקצוע
    // ושם המקצוע
    professions: { id: number; prof: string }[]; 

    //null הפרומט הנוכחי - יכול להכיל אוביקט של פרומפט או להיות 
    currentPrompt: Prompt | null;

    //null הגירסא הנוכחי - יכול להכיל אוביקט של גירסא או להיות 
    currentVersion: Version | null;
}

