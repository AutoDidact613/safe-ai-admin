import { configureStore } from "@reduxjs/toolkit";
import exampleReducer from "../features/example/exampleSlice";
import historyReducer from "../features/data-history/historySlice";
import tableReducer from "../features/tabl_data/tableSlice";
export const store = configureStore({
  reducer: {
    example: exampleReducer,
    historys: historyReducer, // לפי השם שנתת בסלייס
    table: tableReducer,      // 👈 זה מה שחסר לך
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
