// controllers/course.controller.js
const mongoose = require('mongoose');
const { Course } = require('../model/CourseModel');
const Instructor = require('../model/InstructorModel'); // optional, non-blocking
const Assignment = require('../model/AssignmentModel'); // NEW: for attach hydration
const Quiz = require('../model/QuizModel'); // NEW: for attach hydration
const { attachItemToCourse } = require('./_work.helpers'); // NEW: reuse attach helper

function getAuthIdentity(req) {
  const userId = req.user?.id;
  const name = (req.user?.name && String(req.user.name).trim()) || '';
  const email = (req.user?.email && String(req.user.email).trim()) || '';
  return { userId, name, email };
}
const asArray = (v) => (Array.isArray(v) ? v : []);
const asNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
async function createCourse(req, res, next) {
  try {
    const { userId, name, email } = getAuthIdentity(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const p = req.body ?? {};
    const title = (p.title ?? '').trim();
    if (!title) return res.status(400).json({ message: 'Title is required' });
    const author = name || email || 'Unknown';
    const course = await Course.create({
      owner: userId,
      author,
      title,
      description: p.description ?? '',
      learningOutcomes: asArray(p.learningOutcomes),
      thumbnail: { mode: 'link', link: p?.thumbnail?.link || '' },
      modules: asArray(p.modules), // only non-work items if you still use modules
      totalEstimatedMinutes: asNumber(p.totalEstimatedMinutes, 0),
      counts: {
        videos: asNumber(p?.counts?.videos, 0),
        documentation: asNumber(p?.counts?.documentation, 0),
        assignments: 0, // works added later will update these counts
        quizzes: 0,
      },
      status: p.status === 'published' ? 'published' : 'draft',
      // assignments/quizzes arrays start empty
    });
    // Optional: track under Instructor profile (non-blocking)
    try {
      await Instructor.findOneAndUpdate(
        { userId },
        { $addToSet: { coursesCreated: course._id } },
        { upsert: false }
      );
    } catch (_) {}
    return res.status(201).json(course);
  } catch (err) {
    next(err);
  }
}
async function listMyCourses(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const docs = await Course.find({ owner: userId }).sort({ createdAt: -1 });
    return res.json(docs);
  } catch (err) {
    next(err);
  }
}
async function getMyCourseById(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid course id' });
    }
    const doc = await Course.findOne({ _id: id, owner: userId });
    if (!doc) return res.status(404).json({ message: 'Course not found' });
    return res.json(doc);
  } catch (err) {
    next(err);
  }
}
async function updateMyCourse(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid course id' });
    }
    const { owner, author, _id, id: clientId, assignments, quizzes, ...payload } = req.body ?? {};
    const updated = await Course.findOneAndUpdate(
      { _id: id, owner: userId },
      { $set: payload },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Course not found' });
    return res.json(updated);
  } catch (err) {
    next(err);
  }
}
async function deleteMyCourse(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid course id' });
    }
    const removed = await Course.findOneAndDelete({ _id: id, owner: userId });
    if (!removed) return res.status(404).json({ message: 'Course not found' });
    // NOTE: We are not cascading delete works here. Do that via
    // dedicated endpoints if you want a "dangerous delete" path.
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// NEW: POST /api/courses/:courseId/modules/:moduleIndex/items
// Attach an existing work item (assignment/quiz) into a course module by refId
async function attachItemToModule(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { courseId, moduleIndex } = req.params;
    const { type, refId } = req.body ?? {};

    if (!['assignment', 'quiz'].includes(type)) {
      return res.status(400).json({ message: 'Unsupported item type' });
    }
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ message: 'Invalid course id' });
    }
    const idx = Number(moduleIndex);
    if (!Number.isFinite(idx) || idx < 0) {
      return res.status(400).json({ message: 'Invalid module index' });
    }
    if (!mongoose.isValidObjectId(refId)) {
      return res.status(400).json({ message: 'Invalid refId' });
    }

    // Load canonical document owned by user
    let doc;
    if (type === 'assignment') {
      doc = await Assignment.findOne({ _id: refId, owner: userId });
    } else if (type === 'quiz') {
      doc = await Quiz.findOne({ _id: refId, owner: userId });
    }
    if (!doc) return res.status(404).json({ message: `${type} not found` });

    // Hydrate lightweight item from canonical source
    const item = {
      type,
      title: doc.title,
      estimatedMinutes: Number(doc.estimatedMinutes) || 0,
      url: '',
      refId: doc.id,
    };

    // Counter increments on Course
    const countersInc = {
      totalEstimatedMinutes: item.estimatedMinutes,
      [`counts.${type === 'assignment' ? 'assignments' : 'quizzes'}`]: 1,
    };

    const course = await attachItemToCourse({ userId, courseId, moduleIndex: idx, item, countersInc });

    const lightweight = { id: doc.id, type, title: doc.title, estimatedMinutes: item.estimatedMinutes };
    return res.status(201).json({ ok: true, course, item: lightweight });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createCourse,
  listMyCourses,
  getMyCourseById,
  updateMyCourse,
  deleteMyCourse,
  attachItemToModule, // NEW export
};
