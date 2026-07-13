import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    organization: String, // Deprecated - kept for backward compatibility
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: false, // Not required initially to support existing users
    },
    role: {
      type: String,
      enum: ["admin", "user", "org_owner"],
      default: "user",
    },
    
    // --- Authentication fields ---
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
    
    // --- Google OAuth fields ---
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows null values while maintaining uniqueness for non-null values
    },

    // --- שדות עבור המפתח שהמשתמש מקבל ממך (App Level) ---
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

    // --- שדות עבור התקשורת הפנימית מול LiteLLM (Infrastructure Level) ---
    litellmKeyEncrypted: {
      type: String, // המפתח הגלוי (sk-safeai-...) אחרי הצפנה ב-userService
      required: true,
    },
    litellmPrefix: {
      type: String, // key_name שחזר מ-LiteLLM
      required: true,
    },
    litellmToken: {
      type: String, // ה-token (ההאש) שחזר מ-LiteLLM לניהול המפתח
      required: true,
    },

    // --- הגדרות פרופיל ומודלים ---
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AIProfile",
    },
    mode: {
      type: String,
      enum: ["BYOK", "MANAGED"],
      default: "BYOK",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    
    // --- Rate Limits ---
    rateLimits: {
      requestsPerMinute: { type: Number, default: 60 },
      requestsPerDay: { type: Number, default: 10000 },
    },
    
    // --- Cost Limits (MANAGED mode only) ---
    costLimits: {
      monthlyBudget: { type: Number, default: 1 },      // $1 free per month
      currentMonthSpent: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
    
    // --- Free Provider Keys (keys that don't cost money) ---
    freeProviderKeys: [String],
    
    // --- Refresh tokens for JWT ---
    refreshTokens: [String],
  },
  { timestamps: true },
);

// Index for faster lookups
UserSchema.index({ verificationToken: 1 });
UserSchema.index({ passwordResetToken: 1 });

UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    const obj = ret as any;

    // אנחנו לא רוצים לחשוף מידע רגיש ב-API החיצוני
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

export const User = mongoose.model("User", UserSchema);
