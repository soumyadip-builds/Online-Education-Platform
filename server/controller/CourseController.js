// controllers/course.controller.js
const mongoose = require('mongoose');
const { Course } = require('../model/CourseModel');
const Instructor = require('../model/InstructorModel'); // optional, non-blocking
const Assignment = require('../model/AssignmentModel'); // used by attach
const Quiz = require('../model/QuizModel');             // used by attach
const { attachItemToCourse } = require('./_work.helpers'); // used by attach

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

// --- NEW: compute counts from modules (source of truth) ---
function computeCountsFromModules(mods) {
  const out = { videos: 0, documentation: 0, assignments: 0, quizzes: 0 };
  (mods || []).forEach((m) => {
    (m.items || []).forEach((it) => {
      const t = String(it.type || '').toLowerCase();
      if (t === 'video') out.videos += 1;
      else if (t === 'reading') out.documentation += 1;
      else if (t === 'assignment') out.assignments += 1;
      else if (t === 'quiz') out.quizzes += 1;
    });
  });
  return out;
}

// --- NEW: compute total minutes from modules (keeps DB consistent) ---
function computeTotalMinutesFromModules(mods) {
  let total = 0;
  (mods || []).forEach((m) => {
    (m.items || []).forEach((it) => {
      const mins = Number(it.estimatedMinutes);
      if (Number.isFinite(mins) && mins > 0) total += mins;
    });
  });
  return total;
}

async function createCourse(req, res, next) {
  try {
    const { userId, name, email } = getAuthIdentity(req);
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // If multipart: client sent FormData with a 'meta' JSON part
    const raw = typeof req.body.meta === 'string' ? JSON.parse(req.body.meta) : (req.body ?? {});
    const p = raw || {};

    const title = (p.title ?? '').trim();
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const author = name || email || 'Unknown';

    // Normalize modules and derive counts/total server-side
    const modules = asArray(p.modules);
    const counts = computeCountsFromModules(modules);
    // Prefer computing total from modules to keep truth in one place
    const totalEstimatedMinutes = computeTotalMinutesFromModules(modules);

    // --- Thumbnail normalization (supports link & upload) ---
    // Start with payload thumbnail
    const t = p.thumbnail || {};
    let thumbnail = {
      mode: t.mode === 'upload' ? 'upload' : 'link',
      link: t.mode === 'link' ? (t.link || '') : '',
      fileName: t.fileName || '',
    };

    // If file provided (multer), prefer it
    // NOTE: set storageKey/etag here if you upload to S3/local disk.
    if (req.file) {
      thumbnail = {
        mode: 'upload',
        link: '', // not used for uploads
        fileName: req.file.originalname || thumbnail.fileName,
        mimeType: req.file.mimetype || thumbnail.mimeType,
        sizeBytes: typeof req.file.size === 'number' ? req.file.size : thumbnail.sizeBytes,
        storageKey: thumbnail.storageKey || '', // fill from storage provider if you upload here
        etag: thumbnail.etag || '',             // fill from storage provider if you upload here
      };
    }

    const course = await Course.create({
      owner: userId,
      author,
      title,
      description: p.description ?? '',
      learningOutcomes: asArray(p.learningOutcomes),
      thumbnail,
      modules, // keep embedded items for non-work content and placements
      totalEstimatedMinutes,
      counts, // ✅ now computed server-side and always correct
      // status: p.status === 'published' ? 'published' : 'draft', // omit if status removed from schema
      // assignments/quizzes arrays: omit if you removed them from the schema
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

    // prevent sensitive fields from being overwritten via payload
    const { owner, author, _id, id: clientId, assignments, quizzes, ...payload } = req.body ?? {};

    // (Optional) If modules are updated, recompute counts/total server-side to keep consistency
    if (Array.isArray(payload.modules)) {
      payload.counts = computeCountsFromModules(payload.modules);
      payload.totalEstimatedMinutes = computeTotalMinutesFromModules(payload.modules);
    }

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
    // NOTE: Not cascading deletes for works here.
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
  attachItemToModule,
};