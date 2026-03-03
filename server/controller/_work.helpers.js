// controllers/_work.helpers.js
const mongoose = require('mongoose');
const { Course } = require('../model/CourseModel');

// Attach one item to a specific module index of a course
async function attachItemToCourse({ userId, courseId, moduleIndex, item, countersInc }) {
  if (!mongoose.isValidObjectId(courseId)) throw new Error('Invalid course id');

  const modIdx = Number(moduleIndex);
  if (!Number.isInteger(modIdx) || modIdx < 0) throw new Error('Invalid module index');

  const course = await Course.findOne({ _id: courseId, owner: userId });
  if (!course) throw Object.assign(new Error('Course not found'), { status: 404 });

  if (!Array.isArray(course.modules) || modIdx >= course.modules.length) {
    throw Object.assign(new Error('Module index out of range'), { status: 400 });
  }

  const itemsPath = `modules.${modIdx}.items`;

  const updated = await Course.findOneAndUpdate(
    { _id: courseId, owner: userId },
    { $push: { [itemsPath]: item }, $inc: countersInc },
    { new: true }
  );

  if (!updated) throw Object.assign(new Error('Course not found'), { status: 404 });
  return updated;
}

// Update all embedded items (title/estimatedMinutes) that reference a work id & type
async function mirrorItemUpdateAcrossCourse({ userId, workId, type, fields }) {
  // Update ALL modules.items where type matches and refId == workId
  const arrayFilters = [{ 'i.refId': String(workId), 'i.type': type }];

  const setOps = {};
  if (fields.title !== undefined) setOps['modules.$[m].items.$[i].title'] = fields.title;
  if (fields.estimatedMinutes !== undefined) setOps['modules.$[m].items.$[i].estimatedMinutes'] = fields.estimatedMinutes;

  if (Object.keys(setOps).length === 0) return { matched: 0 };

  const res = await Course.updateMany(
    { owner: userId },
    { $set: setOps },
    // Filter 'm' to any module that exists; filter 'i' to matching items only
    { arrayFilters: [{ 'm.items': { $exists: true } }, ...arrayFilters] }
  );
  return res;
}

// Pull any embedded items referencing the work (and adjust counters) accurately
async function removeItemRefsForWork({ userId, workId, type }) {
  // 1) Find courses that contain the referenced item
  const courses = await Course.find({
    owner: userId,
    'modules.items': { $elemMatch: { refId: String(workId), type } }
  }).lean();

  let removedFromCourses = 0;
  let totalMinutesRemoved = 0;

  for (const c of courses) {
    let itemsRemovedInCourse = 0;
    let minutesInCourse = 0;

    for (const mod of c.modules || []) {
      for (const it of (mod.items || [])) {
        if (it && it.refId === String(workId) && it.type === type) {
          itemsRemovedInCourse += 1;
          minutesInCourse += Number(it.estimatedMinutes) || 0;
        }
      }
    }

    if (itemsRemovedInCourse > 0) {
      removedFromCourses += 1;
      totalMinutesRemoved += minutesInCourse;

      const inc = {
        totalEstimatedMinutes: -Math.abs(minutesInCourse),
        ...(type === 'assignment' ? { 'counts.assignments': -itemsRemovedInCourse } : {}),
        ...(type === 'quiz' ? { 'counts.quizzes': -itemsRemovedInCourse } : {}),
      };

      await Course.updateOne(
        { _id: c._id, owner: userId },
        { $pull: { 'modules.$[].items': { refId: String(workId), type } }, $inc: inc }
      );
    }
  }

  return { removedFromCourses, totalMinutesRemoved };
}

module.exports = {
  attachItemToCourse,
  mirrorItemUpdateAcrossCourse,
  removeItemRefsForWork,
};