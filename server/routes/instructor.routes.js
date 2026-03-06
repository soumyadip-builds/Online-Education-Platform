// routes/instructor.routes.js
const express = require("express");
const router = express.Router();
const { getInstructorDashboard } = require("../controller/instructor.controller");
const { requireAuth } = require("../middleware/requireAuth");

// GET /api/instructor/:id/dashboard
router.get("/:id/dashboard", requireAuth, getInstructorDashboard);

module.exports = router;