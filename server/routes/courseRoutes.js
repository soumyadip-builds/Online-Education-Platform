// routes/course.routes.js
const express = require('express');
const {
  createCourse,
  listMyCourses,
  getMyCourseById,
  updateMyCourse,
  deleteMyCourse,
  attachItemToModule, 
} = require('../controller/CourseController');

const { requireAuth } = require('../middleware/requireAuth'); // adjust path if needed

const router = express.Router();

// All routes below require a valid JWT
router.use(requireAuth);

router.post('/', createCourse);
router.get('/', listMyCourses);
router.get('/:id', getMyCourseById);
router.put('/:id', updateMyCourse);
router.delete('/:id', deleteMyCourse);

// NEW generic attach (Option A)
router.post('/:courseId/modules/:moduleIndex/items', attachItemToModule);

module.exports = router;