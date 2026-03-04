// routes/quiz.routes.js
const express = require('express');
const router = express.Router();

const { requireAuth } = require('../middleware/requireAuth');
const {
  createQuizStandalone,
  updateQuiz,
  deleteQuiz,
  getById,
  submitQuizAttempt
} = require('../controller/quiz.controller');

// All routes below require a valid JWT (same pattern as assignments)
router.use(requireAuth);

// Create a standalone quiz
// POST /api/quizzes
router.post('/', createQuizStandalone);

// Edit a quiz
// PATCH /api/quizzes/:id
router.patch('/:id', updateQuiz);

// Delete a quiz (also removes any course items that reference it, if your controller does that)
// DELETE /api/quizzes/:id
router.delete('/:id', deleteQuiz);

router.get('/:id', getById); // GET /api/quizzes/:id


// Submit quiz attempt (server-side grading)
// POST /edstream/quizzes/:id/submit
router.post('/:id/submit', submitQuizAttempt);


module.exports = router;