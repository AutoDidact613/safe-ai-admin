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

// Index for faster lookups
OrganizationSchema.index({ ownerId: 1 });
OrganizationSchema.index({ name: 1 });

OrganizationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const obj = ret as any;
    delete obj.__v;
    return obj;
  },
});

export const Organization = mongoose.model("Organization", OrganizationSchema);
