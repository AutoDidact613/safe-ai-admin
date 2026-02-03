import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

type ExampleState = {
  counter: number;
};

const initialState: ExampleState = {
  counter: 0,
};

const exampleSlice = createSlice({
  name: "example",
  initialState,
  reducers: {
    increment(state:ExampleState) {
      state.counter += 1;
    },
    addBy(state:ExampleState, action: PayloadAction<number>) {
      state.counter += action.payload;
    },
  },
});

export const { increment, addBy } = exampleSlice.actions;
export default exampleSlice.reducer;
