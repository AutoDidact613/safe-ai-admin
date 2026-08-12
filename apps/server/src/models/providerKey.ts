import mongoose from "mongoose";

const ProviderKeySchema = new mongoose.Schema(
{
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  provider: {
    type: String,
    enum: ["openai","anthropic","google","groq"],
  },

   apiKeyEncrypted: {
      type: String,
      required: true,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

  apiKey: String
},
{ timestamps: true }
);

ProviderKeySchema.set("toJSON", {
  transform: (_doc, ret) => {
    const obj = ret as any;

    delete obj.apiKeyEncrypted;
    delete obj.__v;

    return obj;
  },
});

export const ProviderKey = mongoose.model("ProviderKey", ProviderKeySchema);