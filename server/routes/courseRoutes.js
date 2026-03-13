// routes/course.routes.js
const express = require("express");
const {
  createCourse,
  getMyCourseById, // (unused in this router, kept for completeness)
  getCourse,
  updateMyCourse,
  deleteMyCourse,
  attachItemToModule,
  listCourses,
  enrollCourse,
  updateModule,
} = require("../controller/CourseController");

const { requireAuth } = require("../middleware/requireAuth"); 
const { optionalAuth } = require("../middleware/optionalAuth");

const router = express.Router();

// ---- PUBLIC GET ROUTES (with optional user context) ----
router.get("/", optionalAuth, listCourses);
router.get("/:id", optionalAuth, getCourse);

// ---- PROTECTED (mutating) ROUTES ----
// (Optional) logging only on protected routes to reduce noise
router.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

router.use(requireAuth);

router.post("/", createCourse);
router.put("/:id", updateMyCourse);
router.delete("/:id", deleteMyCourse);
router.post("/:id/enroll", enrollCourse);
router.post("/:courseId/modules/:moduleIndex/items", attachItemToModule);
router.patch("/:id/modules/:moduleIndex", updateModule);

module.exports = router;