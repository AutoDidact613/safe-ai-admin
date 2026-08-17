function idsInclude(idArray, id) {
  return (idArray || []).map((x) => x.toString()).includes(id.toString());
}

function canViewCourse(user, course) {
  if (user.role === "coordinator" || user.role === "secretary") return true;
  if (user.role === "teacher") return idsInclude(user.teachesCourseIds, course._id);
  if (user.role === "student") return idsInclude(user.enrolledCourseIds, course._id);
  return false;
}

function canEditCourse(user, course) {
  if (user.role === "coordinator") return true;
  if (user.role === "teacher") return idsInclude(user.teachesCourseIds, course._id);
  return false;
}

function canViewLessonLog(user, log) {
  if (user.role === "coordinator" || user.role === "secretary") return true;
  if (user.role === "teacher") return idsInclude(user.teachesCourseIds, log.courseId);
  if (user.role === "student") return idsInclude(user.enrolledCourseIds, log.courseId);
  return false;
}

function canEditLessonLog(user, log) {
  if (user.role === "coordinator") return true;
  if (user.role === "teacher") return log.teacherId.toString() === user._id.toString();
  return false;
}

function canCreateLessonLogForCourse(user, courseId) {
  if (user.role === "coordinator") return true;
  if (user.role === "teacher") return idsInclude(user.teachesCourseIds, courseId);
  return false;
}

// canViewSubmission/canReviewSubmission take the lesson log the submission belongs to,
// since ownership of a submission is scoped by the course of its lesson log, not the submission itself.
function canViewSubmission(user, submission, log) {
  if (user.role === "coordinator" || user.role === "secretary") return true;
  if (user.role === "student") return submission.studentId.toString() === user._id.toString();
  if (user.role === "teacher") return !!log && idsInclude(user.teachesCourseIds, log.courseId);
  return false;
}

function canReviewSubmission(user, log) {
  if (user.role === "coordinator") return true;
  if (user.role === "teacher") return !!log && idsInclude(user.teachesCourseIds, log.courseId);
  return false;
}

module.exports = {
  idsInclude,
  canViewCourse,
  canEditCourse,
  canViewLessonLog,
  canEditLessonLog,
  canCreateLessonLogForCourse,
  canViewSubmission,
  canReviewSubmission,
};
