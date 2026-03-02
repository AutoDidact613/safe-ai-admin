import { configureStore } from "@reduxjs/toolkit";
import exampleReducer from "../features/example/exampleSlice";
import inquiriesReducer from "../features/Inquiries/inquiriesSlice";

export const store = configureStore({
  reducer: {
    example: exampleReducer,
    inquiries: inquiriesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
