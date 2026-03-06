const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/requireAuth');
const { getCourseWork } = require('../controller/coursework.controller');

router.use(requireAuth);
router.get('/:courseId/work', getCourseWork); // /api/courses/:courseId/work

module.exports = router;