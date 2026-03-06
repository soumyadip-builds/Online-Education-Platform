// controllers/instructor.controller.js
const mongoose = require("mongoose");
const { Course } = require("../model/CourseModel");
const Enrollment = require("../model/EnrollmentModel");
const Assignment = require("../model/AssignmentModel");
const Quiz = require("../model/QuizModel");
const AssignmentSubmission = require("../model/AssignmentSubmissionModel");
const QuizSubmission = require("../model/QuizSubmission");

const asId = (v) => (typeof v === "string" ? v : v?.toString());
const isValidId = (v) => mongoose.Types.ObjectId.isValid(v);

/**
 * Scan Course.modules[].items[] to build assignmentIds & quizIds per course.
 * Items look like: { type: 'assignment'|'quiz'|..., refId: String(ObjectId), ... }
 */
function buildTrackablesFromCourse(courseDoc) {
  const assignmentIds = [];
  const quizIds = [];

  const modules = Array.isArray(courseDoc.modules) ? courseDoc.modules : [];
  for (const m of modules) {
    const items = Array.isArray(m.items) ? m.items : [];
    for (const it of items) {
      if (!it?.refId) continue;
      if (!isValidId(it.refId)) continue; // ignore malformed refs
      if (it.type === "assignment") assignmentIds.push(it.refId);
      if (it.type === "quiz") quizIds.push(it.refId);
    }
  }

  return { assignmentIds, quizIds };
}

/**
 * GET /api/instructor/:id/dashboard
 * Returns normalized data for the InstructorDashboard UI.
 */
exports.getInstructorDashboard = async (req, res, next) => {
  try {
    const instructorId = req.params.id;
    if (!mongoose.isValidObjectId(instructorId)) {
      return res.status(400).json({ message: "Invalid instructor id" });
    }

    // 1) Courses created by this instructor (Course.owner)
    const courses = await Course.find({ owner: instructorId })
      .select("_id title modules")
      .lean(); // modules needed to map assignments/quizzes
    

    if (!courses.length) {
      return res.json({ courses: [], learnersByCourse: {}, metrics: {} });
    }

    const courseIds = courses.map((c) => asId(c._id));

    // 2) Compute assignment + quiz IDs per course by walking Course.modules.items.refId
    const assignmentsByCourse = {};
    const quizzesByCourse = {};
    const assignmentIdToCourseId = {};
    const quizIdToCourseId = {};

    for (const c of courses) {
      const cid = asId(c._id);
      const { assignmentIds, quizIds } = buildTrackablesFromCourse(c); // ← from modules.items
      assignmentsByCourse[cid] = assignmentIds;
      quizzesByCourse[cid] = quizIds;

      for (const aId of assignmentIds) assignmentIdToCourseId[asId(aId)] = cid;
      for (const qId of quizIds) quizIdToCourseId[asId(qId)] = cid;
    }

    const allAssignmentIds = Object.keys(assignmentIdToCourseId);
    const allQuizIds = Object.keys(quizIdToCourseId);

    // 3) Enrollments → learners per course
    const enrollments = await Enrollment.find({
      course: { $in: courseIds.map((id) => new mongoose.Types.ObjectId(id)) },
      role: "learner",
    })
      .populate({ path: "user", select: "name email" })
      .select("course user")
      .lean();

    const learnersByCourse = {};
    for (const e of enrollments) {
      const cid = asId(e.course);
      const u = e.user || {};
      if (!learnersByCourse[cid]) learnersByCourse[cid] = [];
      learnersByCourse[cid].push({
        userId: asId(u._id),
        name: u.name || "(Unnamed)",
        email: u.email || "",
      });
    }

    // 4) Submissions
    const [assSubs, quizSubs] = await Promise.all([
      allAssignmentIds.length
        ? AssignmentSubmission.find({
            assignment: { $in: allAssignmentIds.map((id) => new mongoose.Types.ObjectId(id)) },
          })
            .select("assignment user status score submittedAt fileName link fileUrl")
            .lean()
        : [],
      allQuizIds.length
        ? QuizSubmission.find({
            quiz: { $in: allQuizIds.map((id) => new mongoose.Types.ObjectId(id)) },
          })
            .select("quiz user courseId score maxScore passed submittedAt")
            .lean()
        : [],
    ]);
    // Shapes come from your models. [2](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/AssignmentModel.js)[1](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/CourseModel.js)

    // 5) Build metrics structure
    const metrics = {};
    for (const cid of courseIds) {
      const totals = {
        assignments: assignmentsByCourse[cid]?.length || 0,
        quizzes: quizzesByCourse[cid]?.length || 0,
      };
      metrics[cid] = {
        totals: { ...totals, trackable: totals.assignments + totals.quizzes },
        byStudent: {},
      };
    }

    // 5a) Assignment submissions are unique per (assignment,user) by index. Count all. [2](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/AssignmentModel.js)
    for (const s of assSubs) {
      const aId = asId(s.assignment);
      const cid = assignmentIdToCourseId[aId];
      if (!cid) continue;

      const userId = asId(s.user);
      const courseSlot = metrics[cid];
      if (!courseSlot) continue;

      if (!courseSlot.byStudent[userId]) {
        courseSlot.byStudent[userId] = {
          assignmentsCompleted: 0,
          quizzesCompleted: 0,
          items: { assignments: [], quizzes: [] },
        };
      }
      courseSlot.byStudent[userId].assignmentsCompleted += 1;
      courseSlot.byStudent[userId].items.assignments.push({
        assignmentId: aId,
        status: s.status,
        score: s.score ?? null,
        submittedAt: s.submittedAt,
        fileName: s.fileName ?? null,
        link: s.link ?? null,
        fileUrl: s.fileUrl ?? null,
      });
    }

    // 5b) Quiz submissions: multiple attempts allowed; count each quiz once per user (latest attempt). [1](https://cognizantonline-my.sharepoint.com/personal/2463364_cognizant_com/Documents/Microsoft%20Copilot%20Chat%20Files/CourseModel.js)
    //      We’ll pick the *latest* by submittedAt for each (userId, quizId).
    const latestQuizByUserQuiz = new Map(); // key `${userId}:${quizId}` → doc
    for (const s of quizSubs) {
      const userId = asId(s.user);
      const qId = asId(s.quiz);
      const key = `${userId}:${qId}`;
      const prev = latestQuizByUserQuiz.get(key);
      if (!prev || new Date(s.submittedAt) > new Date(prev.submittedAt)) {
        latestQuizByUserQuiz.set(key, s);
      }
    }
    for (const s of latestQuizByUserQuiz.values()) {
      const userId = asId(s.user);
      // Prefer mapping by quizId→course; fall back to submission.courseId if set
      const qId = asId(s.quiz);
      const cid = quizIdToCourseId[qId] || (isValidId(s.courseId) ? asId(s.courseId) : null);
      if (!cid || !metrics[cid]) continue;

      if (!metrics[cid].byStudent[userId]) {
        metrics[cid].byStudent[userId] = {
          assignmentsCompleted: 0,
          quizzesCompleted: 0,
          items: { assignments: [], quizzes: [] },
        };
      }
      metrics[cid].byStudent[userId].quizzesCompleted += 1;
      metrics[cid].byStudent[userId].items.quizzes.push({
        quizId: qId,
        passed: !!s.passed,
        score: s.score ?? 0,
        maxScore: s.maxScore ?? 0,
        submittedAt: s.submittedAt,
      });
    }

    return res.json({
      courses: courses.map((c) => ({ _id: c._id, title: c.title })),
      learnersByCourse,
      metrics,
    });
  } catch (err) {
    next(err);
  }
};