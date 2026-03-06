const mongoose = require("mongoose");
const Learner = require("../model/LearnerModel"); // ✔️ has userId & coursesEnrolled
// CourseModel exports an object { Course } so destructure it here
const { Course } = require("../model/CourseModel"); // ⬅ ensure this path/name is correct in your project

/**
 * GET /{api|edstream}/learners/by-user/:userId
 * Returns learner doc + full course documents
 */
async function getByUserId(req, res) {
    try {
        const authUserId = req.user?.id || req.user?._id;
        if (!authUserId) {
            return res.status(401).json({ ok: false, error: "Unauthorized" });
        }

        const { userId } = req.params;
        if (!mongoose.isValidObjectId(userId)) {
            return res
                .status(400)
                .json({ ok: false, error: "Invalid user id" });
        }

        // Restrict to self (remove if admins can read others)
        if (String(authUserId) !== String(userId)) {
            return res.status(403).json({ ok: false, error: "Forbidden" });
        }

        // Find learner profile
        const learner = await Learner.findOne({
            userId: new mongoose.Types.ObjectId(userId),
        }).lean();
        if (!learner) {
            return res
                .status(404)
                .json({ ok: false, error: "Learner profile not found" });
        }

        // Resolve full course docs from coursesEnrolled
        const ids = Array.isArray(learner.coursesEnrolled)
            ? learner.coursesEnrolled
            : [];
        // findById is for a single document; we need find with $in to fetch multiple
        const courses = ids.length
            ? await Course.find({ _id: { $in: ids } })
                  .select(
                      "title description modules counts totalEstimatedMinutes coverImage",
                  ) // adjust as needed
                  .lean()
            : [];

        console.log("Inside Learner Controller: ", courses);
        return res.json({
            ok: true,
            data: {
                ...learner,
                courses: courses.map((c) => ({
                    ...c,
                    id: c._id?.toString?.() || c.id,
                })),
            },
        });
    } catch (err) {
        console.error("getByUserId error:", err); // 🔎 so you see the real cause
        return res
            .status(500)
            .json({ ok: false, error: "Failed to load learner" });
    }
}

module.exports = { getByUserId };
``;
