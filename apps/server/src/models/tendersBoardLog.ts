/**
 * server/src/models/tenderLog.ts
 *
 * Mongoose model for tracking Tender Board actions, AI searches, and application events.
 * Logs are automatically deleted after 60 days using TTL index.
 */

import mongoose from "mongoose";

export interface TenderLogDoc extends mongoose.Document {
  action: "CREATE" | "UPDATE" | "DELETE" | "APPLY" | "SMART_CREATE" | "SMART_SEARCH";
  tenderId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId; // במידה ויש משתמש מחובר שמבצע את הפעולה
  status: "SUCCESS" | "FAILED";

  // Metadata for varied actions
  metaData?: {
    textLength?: number;      // אורך הטקסט שנשלח ל-AI
    searchText?: string;      // טקסט החיפוש החופשי
    applicantEmail?: string;  // מייל המועמד שהגיש מועמדות
    changes?: string[];       // שדות שעדכנו
  };

  timestamp: Date;
  errorMessage?: string;

  // TTL - auto-delete after 60 days
  expiresAt: Date;
}

const TenderLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "DELETE", "APPLY", "SMART_CREATE", "SMART_SEARCH"],
      index: true,
    },
    tenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tender", // בהנחה שזה שם המודל של לוח המכרזים/פרויקטים אצלך
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      required: true,
      index: true,
    },
    metaData: {
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    errorMessage: String,

    // TTL - auto-delete after 60 days
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

// TTL index - MongoDB will automatically delete documents after expiresAt
TenderLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for common queries
TenderLogSchema.index({ action: 1, timestamp: -1 });
TenderLogSchema.index({ tenderId: 1, timestamp: -1 });
TenderLogSchema.index({ userId: 1, action: 1, timestamp: -1 });

export const TenderLog = mongoose.model<TenderLogDoc>("TenderLog", TenderLogSchema);