// import { createSlice } from "@reduxjs/toolkit";

// const initialState = {
//   userTable: [
//     { id: 1, name: "שושי", age: 22 },
//     { id: 2, name: "דני", age: 30 },
//     { id: 3, name: "רותי", age: 27 },
//   ],
//   groupTable: [
//     { id: 1, name: "אדריכלות"},
//     { id: 2, name: "תכנות" },
//     { id: 3, name: "צילום" },
//     { id: 4, name: "אדריכלות"},
//     { id: 5, name: "תכנות" },
//     { id: 6, name: "צילום" },
//   ],

// };

// const tableSlice = createSlice({
//   name: "table",
//   initialState,
//   reducers: {

//  // ---- פונקציות ל-userTable ----
//     addUser: (state, action) => {
//       // action.payload צריך להיות {id, name, age}
//       state.userTable.push(action.payload);
//     },
//     removeUser: (state, action) => {
//       // action.payload = id של המשתמש למחיקה
//       state.userTable = state.userTable.filter(user => user.id !== action.payload);
//     },

//     // ---- פונקציות ל-groupTable ----
//     addGroup: (state, action) => {
//       // action.payload צריך להיות {id, name}
//       state.groupTable.push(action.payload);
//     },
//     removeGroup: (state, action) => {
//       // action.payload = id של הקבוצה למחיקה
//       state.groupTable = state.groupTable.filter(group => group.id !== action.payload);
//     },

//   }
// });

// export default tableSlice.reducer;
import { createSlice, type PayloadAction,  } from "@reduxjs/toolkit";

// הגדרת טיפוסים
interface User {
  id: number;
  name: string;
  age: number;
}

interface Group {
  id: number;
  name: string;
}

interface TableState {
  userTable: User[];
  groupTable: Group[];
}

const initialState: TableState = {
  userTable: [
    { id: 1, name: "שושי", age: 22 },
    { id: 2, name: "דני", age: 30 },
    { id: 3, name: "רותי", age: 27 },
  ],
  groupTable: [
    { id: 1, name: "אדריכלות" },
    { id: 2, name: "תכנות" },
    { id: 3, name: "צילום" },
    { id: 4, name: "אדריכלות" },
    { id: 5, name: "תכנות" },
    { id: 6, name: "צילום" },
  ],
};

const tableSlice = createSlice({
  name: "table",
  initialState,
  reducers: {
    // ---- פונקציות ל-userTable ----
    addUser: (state, action: PayloadAction<User>) => {
      state.userTable.push(action.payload);
    },
    removeUser: (state, action: PayloadAction<number>) => {
      state.userTable = state.userTable.filter(user => user.id !== action.payload);
    },

    // ---- פונקציות ל-groupTable ----
    addGroup: (state, action: PayloadAction<Group>) => {
      state.groupTable.push(action.payload);
    },
    removeGroup: (state, action: PayloadAction<number>) => {
      state.groupTable = state.groupTable.filter(group => group.id !== action.payload);
    },
  }
});

export const { addUser, removeUser, addGroup, removeGroup } = tableSlice.actions;
export default tableSlice.reducer;