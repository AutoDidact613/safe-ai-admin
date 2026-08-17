require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDatabase } = require("./db");

const authRoutes = require("./routes/authRoutes");
const courseRoutes = require("./routes/courseRoutes");
const lessonLogRoutes = require("./routes/lessonLogRoutes");
const submissionRoutes = require("./routes/submissionRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/lesson-logs", lessonLogRoutes);
app.use("/api/submissions", submissionRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "שגיאת שרת פנימית" });
});

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDatabase();
  app.listen(PORT, () => console.log(`[server] מאזין על פורט ${PORT}`));
}

start().catch((err) => {
  console.error("נכשל באתחול השרת:", err);
  process.exit(1);
});

module.exports = app;
