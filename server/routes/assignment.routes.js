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

// Assignment CRUD
router.post('/', createAssignmentStandalone);
router.patch('/:id', updateAssignment);
router.delete('/:id', deleteAssignment);
router.get('/:id', getById);

// Submit assignment (file or link)
router.post('/:id/submissions', upload.single('file'), submitAssignment);

// Get current user’s latest submission
router.get('/:id/submissions/me', getMySubmission);

module.exports = router;