const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/requireAuth');
const {
  createAssignmentStandalone,
  updateAssignment,
  deleteAssignment,
  getById,
} = require('../controller/assignment.controller');
const {
  submitAssignment,
  getMySubmission,
} = require('../controller/assignmentSubmission.controller');
const upload = require('../middleware/upload');

router.use(requireAuth);

router.post('/', createAssignmentStandalone);
router.patch('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);
router.get('/:id', getById);

router.post('/:id/submissions', upload.single('file'), submitAssignment);

// existing:
router.get('/:id/submissions/me', getMySubmission);

// NEW alias expected by the front-end:
router.get('/:id/my-submission', getMySubmission);

module.exports = router;