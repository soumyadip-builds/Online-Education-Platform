// controllers/quiz.controller.js
const mongoose = require('mongoose');
const Quiz = require('../model/QuizModel');
const {
  attachItemToCourse,
  mirrorItemUpdateAcrossCourse,
  removeItemRefsForWork,
} = require('./_work.helpers');

const asNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** NEW: GET /api/quizzes/:id */
async function getById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, error: 'Invalid id' });
    }
    const doc = await Quiz.findById(id).lean();
    if (!doc) return res.status(404).json({ ok: false, error: 'Not found' });
    return res.json({ ok: true, data: doc });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to get quiz' });
  }
}

// --- your existing endpoints below (unchanged) ---

// POST /api/quizzes
async function createQuizStandalone(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const p = req.body ?? {};
    const title = (p.title ?? '').trim();
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const quizPayload = {
      shuffleQuestions: !!p?.quiz?.shuffleQuestions,
      questions: Array.isArray(p?.quiz?.questions) ? p.quiz.questions : [],
    };

    const quizDoc = await Quiz.create({
      owner: userId,
      title,
      description: (p.description ?? '').trim(),
      estimatedMinutes: asNumber(p.estimatedMinutes, 1),
      quiz: quizPayload,
      maxScore: asNumber(
        p.maxScore ??
          (Array.isArray(quizPayload.questions)
            ? quizPayload.questions.reduce((s, q) => s + (Number(q.points) || 0), 0)
            : 0),
        0
      ),
      passingScore: asNumber(p.passingScore ?? 1, 1),
    });

    const item = {
      id: quizDoc.id,
      type: 'quiz',
      title: quizDoc.title,
      estimatedMinutes: asNumber(quizDoc.estimatedMinutes, 0),
    };
    return res.status(201).json({ ok: true, quiz: quizDoc, item });
  } catch (err) {
    const status = err?.status ?? 500;
    return res.status(status).json({ message: err.message ?? 'Server error' });
  }
}

// POST /api/courses/:courseId/modules/:moduleIndex/quizzes
async function createQuizAndAttach(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { courseId, moduleIndex } = req.params;
    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({ message: 'Invalid course id' });
    }
    const idx = Number(moduleIndex);
    if (!Number.isFinite(idx) || idx < 0) {
      return res.status(400).json({ message: 'Invalid module index' });
    }

    const p = req.body ?? {};
    const title = (p.title ?? '').trim();
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const quizPayload = {
      shuffleQuestions: !!p?.quiz?.shuffleQuestions,
      questions: Array.isArray(p?.quiz?.questions) ? p.quiz.questions : [],
    };

    const quizDoc = await Quiz.create({
      owner: userId,
      title,
      description: (p.description ?? '').trim(),
      estimatedMinutes: asNumber(p.estimatedMinutes, 1),
      quiz: quizPayload,
      maxScore: asNumber(
        p.maxScore ??
          (Array.isArray(quizPayload.questions)
            ? quizPayload.questions.reduce((s, q) => s + (Number(q.points) || 0), 0)
            : 0),
        0
      ),
      passingScore: asNumber(p.passingScore ?? 1, 1),
    });

    const item = {
      type: 'quiz',
      title: quizDoc.title,
      url: '',
      estimatedMinutes: asNumber(quizDoc.estimatedMinutes, 0),
      refId: quizDoc.id,
    };

    const countersInc = {
      totalEstimatedMinutes: item.estimatedMinutes,
      'counts.quizzes': 1,
    };

    const course = await attachItemToCourse({
      userId,
      courseId,
      moduleIndex: idx,
      item,
      countersInc,
    });

    const lightweight = {
      id: quizDoc.id,
      type: 'quiz',
      title: quizDoc.title,
      estimatedMinutes: item.estimatedMinutes,
    };

    return res.status(201).json({ ok: true, quiz: quizDoc, course, item: lightweight });
  } catch (err) {
    const status = err?.status ?? 500;
    return res.status(status).json({ message: err.message ?? 'Server error' });
  }
}

// PATCH /api/quizzes/:id
async function updateQuiz(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid quiz id' });
    }

    const patch = { ...req.body };
    delete patch.owner; delete patch._id; delete patch.id;
    if (patch.estimatedMinutes !== undefined) patch.estimatedMinutes = asNumber(patch.estimatedMinutes, 0);
    if (patch.maxScore !== undefined) patch.maxScore = asNumber(patch.maxScore, 0);
    if (patch.passingScore !== undefined) patch.passingScore = asNumber(patch.passingScore, 1);

    const updated = await Quiz.findOneAndUpdate(
      { _id: id, owner: userId },
      { $set: patch },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Quiz not found' });

    const fields = {};
    if (patch.title !== undefined) fields.title = updated.title;
    if (patch.estimatedMinutes !== undefined) fields.estimatedMinutes = asNumber(updated.estimatedMinutes, 0);
    if (Object.keys(fields).length) {
      await mirrorItemUpdateAcrossCourse({ userId, workId: id, type: 'quiz', fields });
    }
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message ?? 'Server error' });
  }
}

// DELETE /api/quizzes/:id
async function deleteQuiz(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid quiz id' });
    }
    const doc = await Quiz.findOneAndDelete({ _id: id, owner: userId });
    if (!doc) return res.status(404).json({ message: 'Quiz not found' });
    await removeItemRefsForWork({ userId, workId: id, type: 'quiz' });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message ?? 'Server error' });
  }
}

module.exports = {
  // new read
  getById,
  // existing
  createQuizStandalone,
  createQuizAndAttach,
  updateQuiz,
  deleteQuiz,
};