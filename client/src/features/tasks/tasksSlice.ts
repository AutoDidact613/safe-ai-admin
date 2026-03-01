import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
export interface Task { id: number; title: string; desc: string; date: string; img: string | null | ArrayBuffer; isCompleted: boolean; }

interface TasksState { todos: Task[]; }

const initialState: TasksState = {
    todos: [{ id: 1, date: "03-03-2023", title: "create new feature", desc: "upgrade the app", img: "/1.png", isCompleted: false }, { id: 2, date: "10-04-2023", title: "fix login bug", desc: "handle incorrect credentials", img: "/2.png", isCompleted: false },
    { id: 3, date: "15-04-2023", title: "add user dashboard", desc: "create main user overview screen", img: "/3.png", isCompleted: true }],
};

export const tasksSlice = createSlice({ name: 'tasks', initialState, reducers: { someArived: (state, action: PayloadAction<Task[]>) => { state.todos = [...action.payload]; }, addTask: (state, action: PayloadAction<Omit<Task, 'id'>>) => { const newTask = action.payload as Task; newTask.id = state.todos.length > 0 ? state.todos[state.todos.length - 1].id + 1 : 1; state.todos.push(newTask); }, updateTask: (state, action: PayloadAction<Task>) => { const updatedTask = action.payload; const index = state.todos.findIndex(t => t.id === updatedTask.id); if (index !== -1) { state.todos[index] = { ...updatedTask }; } } } });

export const { someArived, addTask, updateTask } = tasksSlice.actions; export default tasksSlice.reducer;