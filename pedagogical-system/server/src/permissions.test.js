const assert = require("node:assert");
const {
  canViewCourse,
  canEditCourse,
  canViewLessonLog,
  canEditLessonLog,
  canCreateLessonLogForCourse,
  canViewSubmission,
  canReviewSubmission,
} = require("./permissions");

const courseA = { _id: "courseA" };
const courseB = { _id: "courseB" };

const coordinator = { _id: "u-coord", role: "coordinator" };
const secretary = { _id: "u-sec", role: "secretary" };
const teacherA = { _id: "u-teacherA", role: "teacher", teachesCourseIds: [courseA._id] };
const teacherB = { _id: "u-teacherB", role: "teacher", teachesCourseIds: [courseB._id] };
const studentA = { _id: "u-studentA", role: "student", enrolledCourseIds: [courseA._id] };
const studentB = { _id: "u-studentB", role: "student", enrolledCourseIds: [courseB._id] };

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`❌ ${name}\n   ${e.message}`);
  }
}

// --- syllabus (courses) ---
test("coordinator sees every course", () => {
  assert.strictEqual(canViewCourse(coordinator, courseA), true);
  assert.strictEqual(canViewCourse(coordinator, courseB), true);
});
test("secretary sees every course but cannot edit any", () => {
  assert.strictEqual(canViewCourse(secretary, courseA), true);
  assert.strictEqual(canEditCourse(secretary, courseA), false);
});
test("teacher sees and edits only her own course", () => {
  assert.strictEqual(canViewCourse(teacherA, courseA), true);
  assert.strictEqual(canEditCourse(teacherA, courseA), true);
  assert.strictEqual(canViewCourse(teacherA, courseB), false);
  assert.strictEqual(canEditCourse(teacherA, courseB), false);
});
test("student sees only her own enrolled course, and can never edit", () => {
  assert.strictEqual(canViewCourse(studentA, courseA), true);
  assert.strictEqual(canViewCourse(studentA, courseB), false);
  assert.strictEqual(canEditCourse(studentA, courseA), false);
});

// --- lesson logs ---
const logInCourseA = { courseId: courseA._id, teacherId: teacherA._id };
test("teacher sees/edits lesson logs only for her own course, and only her own entries", () => {
  assert.strictEqual(canViewLessonLog(teacherA, logInCourseA), true);
  assert.strictEqual(canViewLessonLog(teacherB, logInCourseA), false);
  assert.strictEqual(canEditLessonLog(teacherA, logInCourseA), true);
  const otherTeachersLogInSameCourse = { courseId: courseA._id, teacherId: "someone-else" };
  assert.strictEqual(canEditLessonLog(teacherA, otherTeachersLogInSameCourse), false);
});
test("student sees lesson logs only for her enrolled course, never edits", () => {
  assert.strictEqual(canViewLessonLog(studentA, logInCourseA), true);
  assert.strictEqual(canViewLessonLog(studentB, logInCourseA), false);
  assert.strictEqual(canEditLessonLog(studentA, logInCourseA), false);
});
test("only coordinator or the owning teacher can create a lesson log for a course", () => {
  assert.strictEqual(canCreateLessonLogForCourse(coordinator, courseA._id), true);
  assert.strictEqual(canCreateLessonLogForCourse(teacherA, courseA._id), true);
  assert.strictEqual(canCreateLessonLogForCourse(teacherB, courseA._id), false);
  assert.strictEqual(canCreateLessonLogForCourse(secretary, courseA._id), false);
});

// --- submissions ---
const submissionByStudentA = { studentId: studentA._id };
test("a student sees only her own submissions, never another student's", () => {
  assert.strictEqual(canViewSubmission(studentA, submissionByStudentA, null), true);
  assert.strictEqual(canViewSubmission(studentB, submissionByStudentA, null), false);
});
test("coordinator/secretary see every submission", () => {
  assert.strictEqual(canViewSubmission(coordinator, submissionByStudentA, null), true);
  assert.strictEqual(canViewSubmission(secretary, submissionByStudentA, null), true);
});
test("teacher sees a submission only if it belongs to her own course's lesson log", () => {
  assert.strictEqual(canViewSubmission(teacherA, submissionByStudentA, logInCourseA), true);
  assert.strictEqual(canViewSubmission(teacherB, submissionByStudentA, logInCourseA), false);
});
test("only coordinator or the owning teacher can review/change a submission's status", () => {
  assert.strictEqual(canReviewSubmission(coordinator, logInCourseA), true);
  assert.strictEqual(canReviewSubmission(teacherA, logInCourseA), true);
  assert.strictEqual(canReviewSubmission(teacherB, logInCourseA), false);
  assert.strictEqual(canReviewSubmission(studentA, logInCourseA), false);
});

console.log(`\n${passed} עברו, ${failed} נכשלו`);
process.exit(failed === 0 ? 0 : 1);
