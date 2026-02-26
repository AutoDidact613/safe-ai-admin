import { configureStore } from "@reduxjs/toolkit";
import exampleReducer from "../features/example/exampleSlice";
import filterManagementReducer from '../features/FilterManagement/FilterManagementSlice';

export const store = configureStore({
  reducer: {
    filterManagement: filterManagementReducer,
    example: exampleReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
