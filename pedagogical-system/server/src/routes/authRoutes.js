const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authenticate, requireRole, JWT_SECRET } = require("../middleware/auth");
const { ROLES } = require("../roles");

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "12h" }
  );
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "יש לספק אימייל וסיסמה" });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ error: "אימייל או סיסמה שגויים" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "אימייל או סיסמה שגויים" });
  }

  res.json({ token: signToken(user), user });
});

router.get("/me", authenticate, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "משתמשת לא נמצאה" });
  res.json({ user });
});

// יצירת משתמשת חדשה - שמורה לרכזת המגמה בלבד (ניהול משתמשים אינו חלק מ-3 המודולים המרכזיים)
router.post("/users", authenticate, requireRole("coordinator"), async (req, res) => {
  const { name, email, password, role, teachesCourseIds, enrolledCourseIds } = req.body;

  if (!name || !email || !password || !ROLES.includes(role)) {
    return res.status(400).json({ error: "שדות חובה חסרים או תפקיד לא תקין" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
    teachesCourseIds: teachesCourseIds || [],
    enrolledCourseIds: enrolledCourseIds || [],
  });

  res.status(201).json({ user });
});

module.exports = router;
