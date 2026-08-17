require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDatabase } = require("./db");
const User = require("./models/User");
const Course = require("./models/Course");
const LessonLog = require("./models/LessonLog");
const Submission = require("./models/Submission");

const DEMO_PASSWORD = "Demo1234!";

async function seed() {
  await connectDatabase();

  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    LessonLog.deleteMany({}),
    Submission.deleteMany({}),
  ]);

  const courseA = await Course.create({
    name: "קורס A",
    units: [
      { title: "יחידה 1", hours: 10, order: 0 },
      { title: "יחידה 2", hours: 8, order: 1 },
      { title: "יחידה 3", hours: 12, order: 2 },
    ],
  });

  const courseB = await Course.create({
    name: "קורס B",
    units: [
      { title: "יחידה 1", hours: 6, order: 0 },
      { title: "יחידה 2", hours: 14, order: 1 },
    ],
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const coordinator = await User.create({
    name: "רכזת מגמה",
    email: "coordinator@example.com",
    passwordHash,
    role: "coordinator",
  });

  const secretary = await User.create({
    name: "מזכירה",
    email: "secretary@example.com",
    passwordHash,
    role: "secretary",
  });

  const teacher1 = await User.create({
    name: "מורה 1",
    email: "teacher1@example.com",
    passwordHash,
    role: "teacher",
    teachesCourseIds: [courseA._id],
  });

  const teacher2 = await User.create({
    name: "מורה 2",
    email: "teacher2@example.com",
    passwordHash,
    role: "teacher",
    teachesCourseIds: [courseB._id],
  });

  const student1 = await User.create({
    name: "תלמידה 1",
    email: "student1@example.com",
    passwordHash,
    role: "student",
    enrolledCourseIds: [courseA._id],
  });

  const student2 = await User.create({
    name: "תלמידה 2",
    email: "student2@example.com",
    passwordHash,
    role: "student",
    enrolledCourseIds: [courseB._id],
  });

  const log1 = await LessonLog.create({
    courseId: courseA._id,
    unitId: courseA.units[0]._id,
    teacherId: teacher1._id,
    date: new Date(),
    note: "הערה גנרית על מהלך השיעור",
    hasAssignment: true,
    assignmentType: "exercise",
    assignmentTitle: "תרגיל 1",
  });

  await LessonLog.create({
    courseId: courseA._id,
    unitId: courseA.units[1]._id,
    teacherId: teacher1._id,
    date: new Date(),
    note: "הערה גנרית נוספת",
    hasAssignment: false,
  });

  await LessonLog.create({
    courseId: courseB._id,
    unitId: courseB.units[0]._id,
    teacherId: teacher2._id,
    date: new Date(),
    note: "הערה גנרית על יחידה 1",
    hasAssignment: true,
    assignmentType: "quiz_solution",
    assignmentTitle: "פתרון בוחן 1",
  });

  await Submission.create({
    lessonLogId: log1._id,
    studentId: student1._id,
    type: "exercise",
    status: "submitted",
    content: "תוכן הגשה גנרי",
    submittedAt: new Date(),
  });

  console.log("Seed הושלם בהצלחה. משתמשות לדוגמה (סיסמה לכולן: " + DEMO_PASSWORD + "):");
  [coordinator, secretary, teacher1, teacher2, student1, student2].forEach((u) =>
    console.log(` - ${u.role}: ${u.email}`)
  );

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
