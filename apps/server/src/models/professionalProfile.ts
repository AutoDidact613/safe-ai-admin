import mongoose, { Schema } from "mongoose";

export const AVATAR_COLOR_PALETTE = [
  "#F87171",
  "#FB923C",
  "#FBBF24",
  "#A3E635",
  "#34D399",
  "#22D3EE",
  "#60A5FA",
  "#818CF8",
  "#C084FC",
  "#F472B6",
];

const ProfessionalProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    name: { type: String, required: true },

    description: { type: String },

    experience: { type: String },

    portfolioLink: { type: String },

    resumeFiles: {
      type: [
        {
          fileKey: { type: String, required: true },
          fileName: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    // נבחר אקראית בשרת בעת יצירת הפרופיל, קבוע לצמיתות
    avatarColor: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const ProfessionalProfile = mongoose.model("ProfessionalProfile", ProfessionalProfileSchema);
