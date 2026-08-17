const mongoose = require("mongoose");
const { ROLES } = require("../roles");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },

    // רלוונטי לתפקיד "מורה" - הקורסים שהיא מלמדת
    teachesCourseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],

    // רלוונטי לתפקיד "תלמידה" - הקורס/מגמה שהיא רשומה אליו
    enrolledCourseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  },
  { timestamps: true }
);

UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("User", UserSchema);
