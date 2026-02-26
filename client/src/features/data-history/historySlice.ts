import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// הגדרת הטיפוס עבור הסטייט של ההיסטוריה
export interface HistoryState {
  dailyChatCount: number;
  dailyLoginCount: number;
  dailyTicketCount: number;
  dailyApiRequestCount: number;
  totalRegisteredUsers: number;
  totalGroupCount: number;
  totalActiveSubscriptions: number;
  totalChatCount: number;
  weeklyChatCounts: number[];
  weeklyApiRequests: number[];
  dailyNewUsers: number;
  weeklyNewUsers: number[];
}

const initialState: HistoryState = {
  dailyChatCount: 0,
  dailyLoginCount: 0,
  dailyTicketCount: 0,
  dailyApiRequestCount: 0,
  totalRegisteredUsers: 70000,
  totalGroupCount: 1500,
  totalActiveSubscriptions: 3500,
  totalChatCount: 1200000,
  weeklyChatCounts: [50, 100, 400, 0, 800, 50, 0],
  weeklyApiRequests: [10, 50, 70, 500, 600, 60, 0],
  dailyNewUsers: 0,
  weeklyNewUsers: [5, 20, 15, 30, 25, 10, 0],
};

export const historySliceActions = createSlice({
  name: "historys",
  initialState,
  reducers: {
    incrementDailyChatCount(state: HistoryState) {
      state.dailyChatCount += 1;
    },
    incrementDailyLoginCount(state: HistoryState) {
      state.dailyLoginCount += 1;
    },
    incrementDailyTicketCount(state: HistoryState) {
      state.dailyTicketCount += 1;
    },
    incrementRegisteredUsers(state: HistoryState) {
      state.totalRegisteredUsers += 1;
    },
    incrementGroupCount(state: HistoryState) {
      state.totalGroupCount += 1;
    },
    incrementTotalChatCount(state: HistoryState) {
      state.totalChatCount += 1;
    },
    updateDailyChatCount(state: HistoryState, action: PayloadAction<{ dayOfWeek: number; chatCount: number }>) {
      const { dayOfWeek, chatCount } = action.payload;
      state.weeklyChatCounts[dayOfWeek] = chatCount;
      state.dailyChatCount = 0;
    },
    updateDailyApiRequests(state: HistoryState, action: PayloadAction<{ dayOfWeek: number; apiRequestCount: number }>) {
      const { dayOfWeek, apiRequestCount } = action.payload;
      state.weeklyApiRequests[dayOfWeek] = apiRequestCount;
      state.dailyApiRequestCount = 0;
    },
    updateDailyNewUsers(state: HistoryState, action: PayloadAction<{ dayOfWeek: number; newUsersCount: number }>) {
      const { dayOfWeek, newUsersCount } = action.payload;
      state.weeklyNewUsers[dayOfWeek] = newUsersCount;
      state.dailyNewUsers = 0;
    }
  }
});

export const {
  incrementDailyChatCount,
  incrementDailyLoginCount,
  incrementDailyTicketCount,
  incrementRegisteredUsers,
  incrementGroupCount,
  incrementTotalChatCount,
  updateDailyChatCount,
  updateDailyApiRequests,
  updateDailyNewUsers,
} = historySliceActions.actions;

export default historySliceActions.reducer;