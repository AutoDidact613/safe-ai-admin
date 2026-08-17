const mongoose = require("mongoose");
const { ASSIGNMENT_TYPES } = require("../roles");

const LessonLogSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    unitId: { type: mongoose.Schema.Types.ObjectId, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    note: { type: String, default: "", trim: true },

    hasAssignment: { type: Boolean, default: false },
    assignmentType: { type: String, enum: ASSIGNMENT_TYPES, default: null },
    assignmentTitle: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

LessonLogSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("LessonLog", LessonLogSchema);
