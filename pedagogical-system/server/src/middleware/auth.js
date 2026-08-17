const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "נדרשת התחברות" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role, name, email }
    next();
  } catch (err) {
    return res.status(401).json({ error: "טוקן לא תקין או שפג תוקפו" });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "אין הרשאה מספקת לפעולה זו" });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, JWT_SECRET };
