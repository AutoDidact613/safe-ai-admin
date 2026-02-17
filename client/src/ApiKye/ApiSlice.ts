import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type UseDetail = {
  day: string;
  tokensUsed: number;
};

type ApiItem = {
  id: number;
  name: string;
  key: string;
  apiAddress?: string;
  userId: number;
  useDitails: UseDetail[];
};

type ApiState = {
  api: ApiItem[];
  currentApi: ApiItem | null;
};

const initialState: ApiState = {
  api: [
    {
      id:1,
      name:'michal',
      key:'12345-ABCDE-67890-FGHIJ',
      userId:1,
      useDitails: [
        {day: 'ראשון', tokensUsed: 1},
        {day: 'שני', tokensUsed: 0},
        {day: 'שלישי', tokensUsed: 0},
        {day: 'רביעי', tokensUsed: 0},
        {day: 'חמישי', tokensUsed: 5},
        {day: 'שישי', tokensUsed: 0},
        {day: 'שבת', tokensUsed: 0}
      ]
    },
    {
      id:2,
      name:'yossi',
      key:'54321-EDCBA-09876-JIHGF',
      userId:2,
      useDitails: [
        {day: 'ראשון', tokensUsed: 0},
        {day: 'שני', tokensUsed: 0},
        {day: 'שלישי', tokensUsed: 0},
        {day: 'רביעי', tokensUsed: 0},
        {day: 'חמישי', tokensUsed: 0},
        {day: 'שישי', tokensUsed: 0},
        {day: 'שבת', tokensUsed: 0}
      ]
    },
    {
      id:3,
      name:'dana',
      key:'11223-AABBCC-33445-DDEEE',
      userId:3,
      useDitails: [
        {day: 'ראשון', tokensUsed: 0},
        {day: 'שני', tokensUsed: 0},
        {day: 'שלישי', tokensUsed: 0},
        {day: 'רביעי', tokensUsed: 0},
        {day: 'חמישי', tokensUsed: 0},
        {day: 'שישי', tokensUsed: 0},
        {day: 'שבת', tokensUsed: 0}
      ]
    }
  ],
  currentApi: null,
}

export const apiSlice = createSlice({
  name: 'api',
  initialState,
  reducers: {
    apiArrived: (state, action: PayloadAction<ApiItem[]>) => {
      const allApi = action.payload;
      state.api = [...allApi];
    },

    addApi: (state, action: PayloadAction<ApiItem>) => {
      const newApi = action.payload;
      if (state.api.length > 0) {
        newApi.id = state.api[state.api.length - 1].id + 1;
      } else {
        newApi.id = 1;
      }
      if (!newApi.useDitails) {
        newApi.useDitails = [];
      }
      state.api.push(newApi);
    },

    updateApi: (state, action: PayloadAction<ApiItem>) => {
      const updatedApi = action.payload;
      const index = state.api.findIndex(p => p.id === updatedApi.id);
      if (index !== -1) {
        const existingUseDitails = state.api[index].useDitails;
        state.api[index] = {
          ...state.api[index],
          ...updatedApi,
          useDitails: updatedApi.useDitails || existingUseDitails
        };
      }
    },

    deleteApi: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      const index = state.api.findIndex(p => p.id === id);
      if (index !== -1) {
        state.api.splice(index, 1);
      }
    },

    changeCurrentApi: (state, action: PayloadAction<ApiItem | null>) => {
      state.currentApi = action.payload;
    },

    resetWeeklyUsage: (state, action: PayloadAction<number>) => {
      const apiId = action.payload;
      const api = state.api.find(p => p.id === apiId);
      if (api && api.useDitails) {
        api.useDitails.forEach(day => {
          day.tokensUsed = 0;
        });
      }
    },

    resetAllWeeklyUsage: (state) => {
      state.api.forEach(api => {
        if (api.useDitails) {
          api.useDitails.forEach(day => {
            day.tokensUsed = 0;
          });
        }
      });
    },

    incrementDayUsage: (state, action: PayloadAction<{ apiId: number; amount?: number }>) => {
      const { apiId, amount }: { apiId: number; amount?: number } = action.payload;
      const api = state.api.find(p => p.id === apiId);
      if (api && api.useDitails) {
        const dayOfWeek = new Date().getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        if (api.useDitails[dayIndex]) {
          api.useDitails[dayIndex].tokensUsed += (amount || 1);
        }
      }
    },

    updateDayTokens: (state, action: PayloadAction<{ apiId: number; dayIndex: number; tokensUsed: number }>) => {
      const { apiId, dayIndex, tokensUsed } = action.payload;
      const api = state.api.find(p => p.id === apiId);
      if (api && api.useDitails && api.useDitails[dayIndex]) {
        api.useDitails[dayIndex].tokensUsed = tokensUsed;
      }
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  apiArrived,
  addApi,
  updateApi,
  deleteApi,
  changeCurrentApi,
  resetWeeklyUsage,
  resetAllWeeklyUsage,
  incrementDayUsage,
  updateDayTokens,
} = apiSlice.actions;

export default apiSlice.reducer;
