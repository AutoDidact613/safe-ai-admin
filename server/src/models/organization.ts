import mongoose from "mongoose";

const OrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    walletBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    settings: {
      // הגדרות ארגוניות כלליות
      maxUsers: {
        type: Number,
        default: 10,
      },
      allowedDomains: [String], // דומיינים מורשים לרישום אוטומטי
    },
  },
  { timestamps: true }
);

// Index for faster lookups (name's unique index is already created by
// `unique: true` on the field above - no need to declare it again here)
OrganizationSchema.index({ ownerId: 1 });

OrganizationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const obj = ret as any;
    delete obj.__v;
    return obj;
  },
});

export const Organization = mongoose.model("Organization", OrganizationSchema);