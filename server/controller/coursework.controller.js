// server/controller/coursework.controller.js
const mongoose = require('mongoose');

// --- Robustly resolve the Course model regardless of export style ---
let Course;
try {
  // Try default CommonJS export: module.exports = model('Course', CourseSchema)
  const maybe = require('../model/CourseModel');
  Course =
    (maybe && typeof maybe.find === 'function' && maybe) ||
    (maybe?.default && typeof maybe.default.find === 'function' && maybe.default) ||
    (maybe?.Course && typeof maybe.Course.find === 'function' && maybe.Course) ||
    null;
} catch (_) {
  Course = null;
}
if (!Course) {
  // If already registered elsewhere, pick it from mongoose.models
  Course = mongoose.models.Course || null;
}

const Quiz = require('../model/QuizModel');          // OK (your file exports a model)
const Assignment = require('../model/AssignmentModel'); // OK (your file exports a model)

/**
 * GET /{api|edstream}/courses/:courseId/work
 * Resolve all quizzes & assignments attached to the course modules.
 */
async function getCourseWork(req, res) {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const { courseId } = req.params;
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ ok: false, error: 'Invalid course id' });
    }

    if (!Course || typeof Course.findById !== 'function') {
      console.error('[coursework.controller] Course model not resolved. Check CourseModel export/path.');
      return res.status(500).json({ ok: false, error: 'Server misconfiguration (Course model)' });
    }

    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ ok: false, error: 'Course not found' });

    // Extract items from modules
    const modules = Array.isArray(course.modules) ? course.modules : [];
    const items = modules.flatMap((m) => (Array.isArray(m.items) ? m.items : []));

    // Collect refIds by type
    const quizIds = [];
    const assignmentIds = [];
    for (const it of items) {
      if (!it || !it.type) continue;
      if (it.type === 'quiz' && it.refId) quizIds.push(it.refId);
      if (it.type === 'assignment' && it.refId) assignmentIds.push(it.refId);
    }

    // Normalize ids => ObjectId (helps when stored as strings)
    const toObjectIds = (arr) =>
      arr
        .filter(Boolean)
        .map((v) => (mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : v));

    const quizObjectIds = toObjectIds(quizIds);
    const assignmentObjectIds = toObjectIds(assignmentIds);

    console.log("Inside coursework.controller, quizObjectIds: ", quizObjectIds);
    // Fetch referenced docs
    const [quizzes, assignments] = await Promise.all([
      quizObjectIds.length ? Quiz.find({ _id: { $in: quizObjectIds } }).lean() : [],
      assignmentObjectIds.length ? Assignment.find({ _id: { $in: assignmentObjectIds } }).lean() : [],
    ]);

    return res.json({
      ok: true,
      data: {
        quizzes: (quizzes || []).map((q) => ({
          id: q._id?.toString?.() || q.id,
          title: q.title,
          estimatedMinutes: q.estimatedMinutes,
          maxScore: q.maxScore,
          passingScore: q.passingScore,
        })),
        assignments: (assignments || []).map((a) => ({
          id: a._id?.toString?.() || a.id,
          title: a.title,
          estimatedMinutes: a.estimatedMinutes,
          maxScore: a.maxScore,
          passingScore: a.passingScore,
          attachmentName: a.attachmentName || null,
        })),
      },
    });
  } catch (err) {
    console.error('[coursework.controller] getCourseWork error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to load course work' });
  }
}

module.exports = { getCourseWork };