const express = require('express');
const EditProfileController = require('../controller/EditProfileController');

const router = express.Router();

/**
 * GET /edstream/editProfile/profile
 * Returns the current user + role-specific profile so the UI can show any
 * previously-saved details (and allow editing/adding).
 */
router.get(
  '/profile',
  // ensureAuth,
  EditProfileController.getProfile
  // or: getProfile
);

/**
 * PUT /edstream/editProfile/profile
 * Saves edits/additions to the profile (upsert behavior).
 */
router.put(
  '/profile',
  // ensureAuth,
  EditProfileController.updateProfile
  // or: updateProfile
);

module.exports = router;