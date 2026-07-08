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
      maxUsers: {
        type: Number,
        default: 10,
      },
      allowedDomains: [String],
      allowedModels: {
        type: [String],
        default: [],
      },
    },
  },
  { timestamps: true }
);

OrganizationSchema.index({ ownerId: 1 });
OrganizationSchema.index({ status: 1 });

OrganizationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const obj = ret as any;
    delete obj.__v;
    return obj;
  },
});

export const Organization = mongoose.model("Organization", OrganizationSchema);