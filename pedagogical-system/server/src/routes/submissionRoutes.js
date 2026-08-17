const express = require("express");
const Submission = require("../models/Submission");
const LessonLog = require("../models/LessonLog");
const User = require("../models/User");
const { authenticate } = require("../middleware/auth");
const { SUBMISSION_STATUSES } = require("../roles");
const { idsInclude, canViewSubmission: canViewSubmissionSync, canReviewSubmission } = require("../permissions");

const router = express.Router();
router.use(authenticate);

async function loadFullUser(req, res, next) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "משתמשת לא נמצאה" });
  req.fullUser = user;
  next();
}
router.use(loadFullUser);

async function canViewSubmission(user, submission) {
  const log = user.role === "teacher" ? await LessonLog.findById(submission.lessonLogId) : null;
  return canViewSubmissionSync(user, submission, log);
}

// מוסיף שדות תצוגה (שם תלמידה, שם קורס/יחידה) בלי לגעת בשדות שעליהם מסתמכת בדיקת ההרשאות
async function enrich(submissions) {
  const Course = require("../models/Course");
  const logs = await LessonLog.find({ _id: { $in: submissions.map((s) => s.lessonLogId) } });
  const logById = new Map(logs.map((l) => [l._id.toString(), l]));

  const courses = await Course.find({ _id: { $in: logs.map((l) => l.courseId) } });
  const courseById = new Map(courses.map((c) => [c._id.toString(), c]));

  const students = await User.find({ _id: { $in: submissions.map((s) => s.studentId) } }, "name");
  const studentNameById = new Map(students.map((u) => [u._id.toString(), u.name]));

  return submissions.map((s) => {
    const log = logById.get(s.lessonLogId.toString());
    const course = log && courseById.get(log.courseId.toString());
    const unit = course?.units.find((u) => u._id.toString() === log.unitId.toString());
    return {
      ...s.toJSON(),
      studentName: studentNameById.get(s.studentId.toString()) || "",
      courseName: course?.name || "",
      unitTitle: unit?.title || "",
      assignmentTitle: log?.assignmentTitle || "",
    };
  });
}

// GET /api/submissions - רשימת הגשות, מסוננת לפי תפקיד
router.get("/", async (req, res) => {
  const user = req.fullUser;
  let submissions = await Submission.find().sort({ createdAt: -1 });

  if (user.role === "student") {
    submissions = submissions.filter((s) => s.studentId.toString() === user._id.toString());
  } else if (user.role === "teacher") {
    const teacherCourseLogIds = new Set(
      (await LessonLog.find({ courseId: { $in: user.teachesCourseIds } })).map((l) => l._id.toString())
    );
    submissions = submissions.filter((s) => teacherCourseLogIds.has(s.lessonLogId.toString()));
  }
  // coordinator / secretary: רואות הכל, ללא סינון

  res.json({ submissions: await enrich(submissions) });
});

// GET /api/submissions/open-assignments - מטלות פתוחות עבור תלמידה (ברירת מחדל: המשתמשת המחוברת)
router.get("/open-assignments", async (req, res) => {
  const user = req.fullUser;
  let studentId = user._id;

  if (req.query.studentId && req.query.studentId !== user._id.toString()) {
    if (user.role === "student") {
      return res.status(403).json({ error: "תלמידה יכולה לצפות רק במטלות הפתוחות של עצמה" });
    }
    studentId = req.query.studentId;
  }

  const student = await User.findById(studentId);
  if (!student) return res.status(404).json({ error: "תלמידה לא נמצאה" });

  const assignmentLogs = await LessonLog.find({
    courseId: { $in: student.enrolledCourseIds },
    hasAssignment: true,
  }).sort({ date: -1 });

  const existing = await Submission.find({
    studentId,
    lessonLogId: { $in: assignmentLogs.map((l) => l._id) },
  });
  const byLog = new Map(existing.map((s) => [s.lessonLogId.toString(), s]));

  const openAssignments = assignmentLogs.map((log) => ({
    lessonLog: log,
    submission: byLog.get(log._id.toString()) || null,
  }));

  res.json({ openAssignments });
});

router.get("/:id", async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ error: "הגשה לא נמצאה" });
  if (!(await canViewSubmission(req.fullUser, submission))) {
    return res.status(403).json({ error: "אין הרשאת צפייה בהגשה זו" });
  }
  res.json({ submission });
});

// POST /api/submissions - תלמידה מגישה מטלה (יצירה או עדכון הגשה קיימת לאותה מטלה)
router.post("/", async (req, res) => {
  const user = req.fullUser;
  if (user.role !== "student") {
    return res.status(403).json({ error: "רק תלמידה יכולה להגיש מטלה" });
  }

  const { lessonLogId, content } = req.body;
  if (!lessonLogId) return res.status(400).json({ error: "יש לציין את השיעור/מטלה המשויכת" });

  const log = await LessonLog.findById(lessonLogId);
  if (!log || !log.hasAssignment) {
    return res.status(400).json({ error: "לא קיימת מטלה פתוחה לשיעור זה" });
  }
  if (!idsInclude(user.enrolledCourseIds, log.courseId)) {
    return res.status(403).json({ error: "ניתן להגיש מטלות רק עבור הקורס שלך" });
  }

  const submission = await Submission.findOneAndUpdate(
    { lessonLogId, studentId: user._id },
    {
      lessonLogId,
      studentId: user._id,
      type: log.assignmentType,
      content: content || "",
      status: "submitted",
      submittedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  res.status(201).json({ submission });
});

// PUT /api/submissions/:id/status - עדכון סטטוס בדיקה ע"י מורה (בעלת הקורס) או רכזת מגמה
router.put("/:id/status", async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) return res.status(404).json({ error: "הגשה לא נמצאה" });

  const user = req.fullUser;
  const log = user.role === "teacher" ? await LessonLog.findById(submission.lessonLogId) : null;
  if (!canReviewSubmission(user, log)) {
    return res.status(403).json({ error: "אין הרשאה לעדכן סטטוס הגשה זו" });
  }

  const { status } = req.body;
  if (!SUBMISSION_STATUSES.includes(status)) {
    return res.status(400).json({ error: "סטטוס לא תקין" });
  }

  submission.status = status;
  await submission.save();
  res.json({ submission });
});

module.exports = router;
