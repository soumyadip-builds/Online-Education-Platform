const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/requireAuth');
const {
  createQuizStandalone,
  updateQuiz,
  deleteQuiz,
  getById,
  submitQuizAttempt,
  getMyLatestSubmission,
} = require('../controller/quiz.controller');

router.use(requireAuth);

router.post('/', createQuizStandalone);
router.patch('/:id', updateQuiz);
router.delete('/:id', deleteQuiz);
router.get('/:id', getById);

// read endpoint for StudentMetrics.jsx
router.get('/:id/my-latest-submission', getMyLatestSubmission);

router.post('/:id/submit', submitQuizAttempt);

module.exports = router;