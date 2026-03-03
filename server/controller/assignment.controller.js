// controllers/assignment.controller.js
const mongoose = require('mongoose');
const Assignment = require('../model/AssignmentModel');
const {
  attachItemToCourse,
  mirrorItemUpdateAcrossCourse,
  removeItemRefsForWork,
} = require('./_work.helpers');

const asNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// NEW: POST /api/assignments
// Create assignment independently and return a lightweight item projection for UI lists
async function createAssignmentStandalone(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const p = req.body ?? {};
    const title = (p.title ?? '').trim();
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const assignment = await Assignment.create({
      owner: userId,
      title,
      description: p.description ?? '',
      attachmentName: p.attachmentName ?? '',
      estimatedMinutes: asNumber(p.estimatedMinutes, 1),
      maxScore: asNumber(p.maxScore, 1),
      passingScore: asNumber(p.passingScore, 1),
    });

    const item = {
      id: assignment.id,
      type: 'assignment',
      title: assignment.title,
      estimatedMinutes: asNumber(assignment.estimatedMinutes, 0),
    };

    return res.status(201).json({ ok: true, assignment, item });
  } catch (err) {
    const status = err?.status ?? 500;
    return res.status(status).json({ message: err.message ?? 'Server error' });
  }
}

// POST /api/courses/:courseId/modules/:moduleIndex/assignments
// Create assignment first, then attach as item into course module
async function createAssignmentAndAttach(req, res, next) {
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

    const assignment = await Assignment.create({
      owner: userId,
      title,
      description: p.description ?? '',
      attachmentName: p.attachmentName ?? '',
      estimatedMinutes: asNumber(p.estimatedMinutes, 1),
      maxScore: asNumber(p.maxScore, 1),
      passingScore: asNumber(p.passingScore, 1),
    });

    const item = {
      type: 'assignment',
      title: assignment.title,
      url: '',
      estimatedMinutes: asNumber(assignment.estimatedMinutes, 0),
      refId: assignment.id, // string id stored in course item
    };

    const countersInc = {
      totalEstimatedMinutes: item.estimatedMinutes,
      'counts.assignments': 1,
    };

    const course = await attachItemToCourse({
      userId,
      courseId,
      moduleIndex: idx,
      item,
      countersInc,
    });

    const lightweight = {
      id: assignment.id,
      type: 'assignment',
      title: assignment.title,
      estimatedMinutes: item.estimatedMinutes,
    };

    return res
      .status(201)
      .json({ ok: true, assignment, course, item: lightweight });
  } catch (err) {
    const status = err?.status ?? 500;
    return res.status(status).json({ message: err.message ?? 'Server error' });
  }
}

// PATCH /api/assignments/:id
// Updates assignment and mirrors title/estimatedMinutes into all course items
async function updateAssignment(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid assignment id' });
    }

    const patch = { ...req.body };
    // prevent ownership & id override
    delete patch.owner;
    delete patch._id;
    delete patch.id;

    // normalize potential numeric fields to safe numbers (if present)
    if (patch.estimatedMinutes !== undefined) {
      patch.estimatedMinutes = asNumber(patch.estimatedMinutes, 0);
    }
    if (patch.maxScore !== undefined) {
      patch.maxScore = asNumber(patch.maxScore, 1);
    }
    if (patch.passingScore !== undefined) {
      patch.passingScore = asNumber(patch.passingScore, 1);
    }

    const updated = await Assignment.findOneAndUpdate(
      { _id: id, owner: userId },
      { $set: patch },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'Assignment not found' });

    const fields = {};
    if (patch.title !== undefined) fields.title = updated.title;
    if (patch.estimatedMinutes !== undefined) {
      fields.estimatedMinutes = asNumber(updated.estimatedMinutes, 0);
    }

    if (Object.keys(fields).length) {
      await mirrorItemUpdateAcrossCourse({
        userId,
        workId: id,
        type: 'assignment',
        fields,
      });
    }

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message ?? 'Server error' });
  }
}

// DELETE /api/assignments/:id
// Deletes assignment and removes any course items that reference it (adjust counters)
async function deleteAssignment(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid assignment id' });
    }

    const doc = await Assignment.findOneAndDelete({ _id: id, owner: userId });
    if (!doc) return res.status(404).json({ message: 'Assignment not found' });

    await removeItemRefsForWork({ userId, workId: id, type: 'assignment' });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message ?? 'Server error' });
  }
}

module.exports = {
  createAssignmentStandalone, // POST /assignments
  createAssignmentAndAttach,  // POST /courses/:courseId/modules/:moduleIndex/assignments (optional)
  updateAssignment,           // PATCH /assignments/:id
  deleteAssignment,           // DELETE /assignments/:id
};