// routes/course.routes.js
const express = require("express");
const {
    createCourse,
    getMyCourseById,
    updateMyCourse,
    deleteMyCourse,
    attachItemToModule,
    listCourses,
    enrollCourse,
    updateModule,
} = require("../controller/CourseController");

const { requireAuth } = require("../middleware/requireAuth"); // adjust path if needed

const router = express.Router();

// All routes below require a valid JWT
router.use(requireAuth);

// print requests for debugging
router.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

router.post("/", createCourse);
router.get("/", listCourses);
router.get("/:id", getMyCourseById);
router.put("/:id", updateMyCourse);
router.delete("/:id", deleteMyCourse);

// ENROLL: learner only
router.post("/:id/enroll", enrollCourse);

// NEW generic attach (Option A)
router.post("/:courseId/modules/:moduleIndex/items", attachItemToModule);

// NEW: Update specific module
router.patch("/:id/modules/:moduleIndex", updateModule);

module.exports = router;
