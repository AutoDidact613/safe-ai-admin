import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/* =======================
   Types
======================= */

export interface Attachment {
  url: string;
  file?: File;
}

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  createdAt: string;
  attachments?: Attachment[];
}

interface InquiriesState {
  inquiries: Inquiry[];
  currentInquiry: Inquiry | null;
}

/* =======================
   Initial State
======================= */

const initialState: InquiriesState = {
  inquiries: [
    {
      id: "12345",
      name: "John Doe",
      email: "John.doe@example.com",
      subject: "Inquiry about product",
      message: "I would like to know more about your product features.",
      status: "open",
      createdAt: "2024-01-15T10:00:00Z",
    },
    {
      id: "67890",
      name: "Jane Smith",
      email: "mjjggf@gmail.com",
      subject: "Support needed",
      message: "I am facing issues with my account login.",
      status: "closed",
      createdAt: "2024-02-20T14:30:00Z",
    },
  ],
  currentInquiry: null,
};

/* =======================
   Slice
======================= */

const inquiriesSlice = createSlice({
  name: "inquiries",
  initialState,
  reducers: {
    addInquiry: (state, action: PayloadAction<Omit<Inquiry, "id" | "status" | "createdAt">>) => {
      state.inquiries.push({
        id: Date.now().toString(),
        name: action.payload.name,
        email: action.payload.email,
        subject: action.payload.subject,
        message: action.payload.message,
        status: "open",
        createdAt: new Date().toISOString(),
        attachments: action.payload.attachments || [],
      });
    },

    updateStatus: (state, action: PayloadAction<{ id: string; status: "open" | "closed" }>) => {
      const inquiry = state.inquiries.find((i) => i.id === action.payload.id);
      if (inquiry) inquiry.status = action.payload.status;
    },

    removeInquiry: (state, action: PayloadAction<string>) => {
      state.inquiries = state.inquiries.filter((i) => i.id !== action.payload);
    },

    setCurrentInquiry: (state, action: PayloadAction<Inquiry | null>) => {
      state.currentInquiry = action.payload;
    },

    updateInquiry: (state, action: PayloadAction<Inquiry>) => {
      const idx = state.inquiries.findIndex((i) => i.id === action.payload.id);
      if (idx !== -1) {
        state.inquiries[idx] = action.payload;
      }
    },
  },
});

export const {
  addInquiry,
  updateStatus,
  removeInquiry,
  setCurrentInquiry,
  updateInquiry,
} = inquiriesSlice.actions;

export default inquiriesSlice.reducer;
