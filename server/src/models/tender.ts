import mongoose, { Schema } from "mongoose";

const TenderSchema = new Schema(
  {
    title: { type: String, required: true },

    publisherUserCode: { type: String },

    shortDescription: { type: String },

    timeRequired: { type: String },

    budget: { type: String },

    productType: { type:String },

    aiApplicationType: { type:String },

    isActive: { type: Boolean, default: true },

    agentsRequired: { type: [String], default: [] },

    wantsEmails: { type: Boolean, default: false },

    additionalDetails: { type: String },

    applicants: {
        type: [
            {
            details: { type: String, required: true },
            name: { type: String, required: true },
            email: { type: String, required: true },
            proposal: { type: String, required: false },
            contactMethod: { type: String, required: false }
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