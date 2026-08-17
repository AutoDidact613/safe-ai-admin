const mongoose = require("mongoose");
const { ASSIGNMENT_TYPES, SUBMISSION_STATUSES } = require("../roles");

const SubmissionSchema = new mongoose.Schema(
  {
    lessonLogId: { type: mongoose.Schema.Types.ObjectId, ref: "LessonLog", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ASSIGNMENT_TYPES, required: true },
    status: { type: String, enum: SUBMISSION_STATUSES, default: "not_submitted" },
    content: { type: String, default: "", trim: true },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SubmissionSchema.index({ lessonLogId: 1, studentId: 1 }, { unique: true });

SubmissionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Submission", SubmissionSchema);
