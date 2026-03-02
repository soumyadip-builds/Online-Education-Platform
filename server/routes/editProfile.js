// routes/EditRouter.js
const express = require('express');
const { updateProfile } = require('../controller/EditProfileController');
// const ensureAuth = require('../middleware/ensureAuth'); // optional JWT/Session middleware

const router = express.Router();

// PUT /api/profile
router.put('/profile', /* ensureAuth, */ updateProfile);

module.exports = router;