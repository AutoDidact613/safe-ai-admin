import { configureStore } from "@reduxjs/toolkit";
import exampleReducer from "../features/example/exampleSlice";
//בראש הקובץ, מתחת לייבואים הקיימים, אנחנו מוסיפים שורה שאומרת למחשב איפה נמצאת הלוגיקה שלך:
import promptReducer from '../features/prompts/PromptSlice';

export const store = configureStore({
  reducer: {
    example: exampleReducer,
    prompts: promptReducer, // הוספת השורה הזו
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
