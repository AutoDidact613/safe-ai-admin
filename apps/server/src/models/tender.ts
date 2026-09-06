import mongoose, { Schema } from "mongoose";

const TenderSchema = new Schema(
  {
    title: { type: String, required: true },

    publisherUserCode: { type: String },

    shortDescription: { type: String },

    timeRequired: {
      type: {
        value: { type: Number },
        unit: { type: String },
      },
      default: { value: 0, unit: 'ימים' }
    },

    budget: { type: Number, default: 0 },

    productType: { type:String },

    aiApplicationType: { type:String },

    isActive: { type: Boolean, default: true },

    agentsRequired: { type: [String], default: [] },

    wantsEmails: { type: Boolean, default: false },

    additionalDetails: { type: String },

    specification: {
      type: {
        status: { type: String, enum: ["pending", "generating", "ready", "failed"] },
        techStackRecommendation: { type: String },
        openSourceReferences: {
          type: [
            {
              title: { type: String, required: true },
              url: { type: String, required: true },
              description: { type: String },
            },
          ],
          default: [],
        },
        readingSources: {
          type: [
            {
              title: { type: String, required: true },
              url: { type: String, required: true },
              description: { type: String },
            },
          ],
          default: [],
        },
        document: { type: String },
        errorMessage: { type: String },
        generatedAt: { type: Date },
        isPublished: { type: Boolean, default: false },
      },
      required: false,
    },

    applicants: {
        type: [
            {
            details: { type: String, required: true },
            name: { type: String, required: true },
            email: { type: String, required: true },
            proposal: { type: Number, required: false },
            contactMethod: { type: String, required: false },
            resumeFileKey: { type: String, required: false },
            portfolioLink: { type: String, required: false },
            professionalProfileId: { type: Schema.Types.ObjectId, ref: "ProfessionalProfile", required: false },
            isViewed: { type: Boolean, default: false },
            userId: { type: String },
            appliedAt: { type: Date, default: Date.now },
            },
        ],
        default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Tender = mongoose.model("Tender", TenderSchema);