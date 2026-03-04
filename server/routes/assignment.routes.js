// routes/assignment.routes.js
const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/requireAuth');
const {
  createAssignmentStandalone,
  updateAssignment,
  deleteAssignment,
  getById
} = require('../controller/assignment.controller');

// All routes below require a valid JWT
router.use(requireAuth);

// Create a standalone assignment
router.post('/', createAssignmentStandalone);

// Edit an assignment
router.patch('/:id', updateAssignment);

// Delete an assignment (also removes any course items that reference it)
router.delete('/:id', deleteAssignment);

router.get('/:id', getById); // GET /edstream/assignments/:id

module.exports = router;