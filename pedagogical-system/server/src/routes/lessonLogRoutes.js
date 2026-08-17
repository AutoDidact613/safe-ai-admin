const express = require("express");
const LessonLog = require("../models/LessonLog");
const User = require("../models/User");

const { authenticate } = require("../middleware/auth");
const {
  canViewLessonLog: canView,
  canEditLessonLog: canEdit,
  canCreateLessonLogForCourse: canCreateForCourse,
} = require("../permissions");

const router = express.Router();
router.use(authenticate);

async function loadFullUser(req, res, next) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "משתמשת לא נמצאה" });
  req.fullUser = user;
  next();
}
router.use(loadFullUser);

// מוסיף teacherName לתצוגה, בלי לגעת בשדה teacherId שעליו מסתמכת בדיקת ההרשאות
async function withTeacherNames(logs) {
  const teacherIds = [...new Set(logs.map((l) => l.teacherId.toString()))];
  const teachers = await User.find({ _id: { $in: teacherIds } }, "name");
  const nameById = new Map(teachers.map((t) => [t._id.toString(), t.name]));
  return logs.map((l) => ({ ...l.toJSON(), teacherName: nameById.get(l.teacherId.toString()) || "" }));
}

router.get("/", async (req, res) => {
  const query = req.query.courseId ? { courseId: req.query.courseId } : {};
  const all = await LessonLog.find(query).sort({ date: -1 });
  const visible = all.filter((log) => canView(req.fullUser, log));
  res.json({ lessonLogs: await withTeacherNames(visible) });
});

router.get("/:id", async (req, res) => {
  const log = await LessonLog.findById(req.params.id);
  if (!log) return res.status(404).json({ error: "רשומת תיעוד לא נמצאה" });
  if (!canView(req.fullUser, log)) return res.status(403).json({ error: "אין הרשאת צפייה ברשומה זו" });
  const [withName] = await withTeacherNames([log]);
  res.json({ lessonLog: withName });
});

router.post("/", async (req, res) => {
  const { courseId, unitId, date, note, hasAssignment, assignmentType, assignmentTitle } = req.body;

  if (!courseId || !unitId || !date) {
    return res.status(400).json({ error: "קורס, יחידה ותאריך הם שדות חובה" });
  }
  if (!canCreateForCourse(req.fullUser, courseId)) {
    return res.status(403).json({ error: "אין הרשאה לתעד שיעור בקורס זה" });
  }
  if (hasAssignment && !assignmentType) {
    return res.status(400).json({ error: "יש לבחור סוג מטלה כאשר סומן שניתנה מטלה" });
  }

  const log = await LessonLog.create({
    courseId,
    unitId,
    teacherId: req.fullUser._id,
    date,
    note: note || "",
    hasAssignment: !!hasAssignment,
    assignmentType: hasAssignment ? assignmentType : null,
    assignmentTitle: assignmentTitle || "",
  });

  res.status(201).json({ lessonLog: log });
});

router.put("/:id", async (req, res) => {
  const log = await LessonLog.findById(req.params.id);
  if (!log) return res.status(404).json({ error: "רשומת תיעוד לא נמצאה" });
  if (!canEdit(req.fullUser, log)) return res.status(403).json({ error: "אין הרשאת עריכה לרשומה זו" });

  const { date, note, hasAssignment, assignmentType, assignmentTitle } = req.body;
  if (date !== undefined) log.date = date;
  if (note !== undefined) log.note = note;
  if (hasAssignment !== undefined) {
    log.hasAssignment = !!hasAssignment;
    log.assignmentType = hasAssignment ? assignmentType || log.assignmentType : null;
  }
  if (assignmentTitle !== undefined) log.assignmentTitle = assignmentTitle;

  if (log.hasAssignment && !log.assignmentType) {
    return res.status(400).json({ error: "יש לבחור סוג מטלה כאשר סומן שניתנה מטלה" });
  }

  await log.save();
  res.json({ lessonLog: log });
});

router.delete("/:id", async (req, res) => {
  const log = await LessonLog.findById(req.params.id);
  if (!log) return res.status(404).json({ error: "רשומת תיעוד לא נמצאה" });
  if (!canEdit(req.fullUser, log)) return res.status(403).json({ error: "אין הרשאת מחיקה לרשומה זו" });

  await log.deleteOne();
  res.json({ ok: true });
});

module.exports = router;
