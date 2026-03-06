const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/requireAuth');
const { getByUserId } = require('../controller/learner.controller');

router.use(requireAuth);
router.get('/by-user/:userId', getByUserId);

module.exports = router;