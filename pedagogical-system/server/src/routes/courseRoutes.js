const express = require("express");
const Course = require("../models/Course");
const User = require("../models/User");
const { authenticate, requireRole } = require("../middleware/auth");
const { canViewCourse: canView, canEditCourse: canEdit } = require("../permissions");

const router = express.Router();
router.use(authenticate);

// מביא את המשתמשת המלאה מה-DB (הטוקן מכיל רק role/name/email, לא את רשימות הקורסים)
async function loadFullUser(req, res, next) {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "משתמשת לא נמצאה" });
  req.fullUser = user;
  next();
}
router.use(loadFullUser);

router.get("/", async (req, res) => {
  const all = await Course.find().sort({ createdAt: 1 });
  const visible = all.filter((c) => canView(req.fullUser, c));
  res.json({ courses: visible });
});

router.get("/:id", async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: "קורס לא נמצא" });
  if (!canView(req.fullUser, course)) return res.status(403).json({ error: "אין הרשאת צפייה בקורס זה" });
  res.json({ course });
});

router.post("/", requireRole("coordinator"), async (req, res) => {
  const { name, units } = req.body;
  if (!name) return res.status(400).json({ error: "שם קורס הוא שדה חובה" });
  const course = await Course.create({ name, units: units || [] });
  res.status(201).json({ course });
});

router.put("/:id", async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: "קורס לא נמצא" });
  if (!canEdit(req.fullUser, course)) return res.status(403).json({ error: "אין הרשאת עריכה לקורס זה" });

  if (req.body.name !== undefined) course.name = req.body.name;
  await course.save();
  res.json({ course });
});

router.delete("/:id", requireRole("coordinator"), async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ error: "קורס לא נמצא" });
  res.json({ ok: true });
});

router.post("/:id/units", async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: "קורס לא נמצא" });
  if (!canEdit(req.fullUser, course)) return res.status(403).json({ error: "אין הרשאת עריכה לקורס זה" });

  const { title, hours, order } = req.body;
  if (!title || hours === undefined) return res.status(400).json({ error: "כותרת ומספר שעות הם שדות חובה" });

  course.units.push({ title, hours, order: order || course.units.length });
  await course.save();
  res.status(201).json({ course });
});

router.put("/:id/units/:unitId", async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: "קורס לא נמצא" });
  if (!canEdit(req.fullUser, course)) return res.status(403).json({ error: "אין הרשאת עריכה לקורס זה" });

  const unit = course.units.id(req.params.unitId);
  if (!unit) return res.status(404).json({ error: "יחידת לימוד לא נמצאה" });

  if (req.body.title !== undefined) unit.title = req.body.title;
  if (req.body.hours !== undefined) unit.hours = req.body.hours;
  if (req.body.order !== undefined) unit.order = req.body.order;

  await course.save();
  res.json({ course });
});

router.delete("/:id/units/:unitId", async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: "קורס לא נמצא" });
  if (!canEdit(req.fullUser, course)) return res.status(403).json({ error: "אין הרשאת עריכה לקורס זה" });

  course.units.id(req.params.unitId)?.deleteOne();
  await course.save();
  res.json({ course });
});

module.exports = router;
