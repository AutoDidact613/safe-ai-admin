import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    organization: String,
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: false,
    },
    role: {
      type: String,
      enum: ["admin", "user", "org_owner"],
      default: "user",
    },
    
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
    
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    proxyKeyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    proxyKeyPrefix: {
      type: String,
      required: true,
      index: true,
    },

    litellmKeyEncrypted: {
      type: String,
      required: true,
    },
    litellmPrefix: {
      type: String,
      required: true,
    },
    litellmToken: {
      type: String,
      required: true,
    },

    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIProfile",
    },
    mode: {
      type: String,
      enum: ["BYOK", "MANAGED", "MANAGED_ORG"],
      default: "BYOK",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    rateLimits: {
      requestsPerMinute: { type: Number, default: 60 },
      requestsPerDay: { type: Number, default: 10000 },
    },
    
    costLimits: {
      monthlyBudget: { type: Number, default: 1 },
      currentMonthSpent: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
    
    freeProviderKeys: [String],
    
    refreshTokens: [String],
  },
  { timestamps: true },
);

UserSchema.index({ verificationToken: 1 });
UserSchema.index({ passwordResetToken: 1 });

UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const obj = ret as any;

    delete obj.password;
    delete obj.proxyKeyHash;
    delete obj.litellmKeyEncrypted;
    delete obj.litellmToken;
    delete obj.verificationToken;
    delete obj.verificationTokenExpires;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    delete obj.refreshTokens;
    delete obj.__v;
    return obj;
  },
});

export const User = mongoose.models.User || mongoose.model("User", UserSchema);