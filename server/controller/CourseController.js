// controllers/CourseController.js
const mongoose = require('mongoose');
const { Course } = require('../model/CourseModel');
const Instructor = require('../model/InstructorModel');
const Learner = require('../model/LearnerModel');
const Assignment = require('../model/AssignmentModel');
const Quiz = require('../model/QuizModel');
const { attachItemToCourse } = require('./_work.helpers');
const Enrollment = require('../model/EnrollmentModel');
const forumController = require('./forum.controller');

function getAuthIdentity(req) {
	const userId = req.user?.id;
	const name = (req.user?.name && String(req.user.name).trim()) || '';
	const email = (req.user?.email && String(req.user.email).trim()) || '';
	return { userId, name, email };
}
const asArray = (v) => (Array.isArray(v) ? v : []);
const asNumber = (v, fallback = 0) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : fallback;
};

function computeCountsFromModules(mods) {
	const out = { videos: 0, documentation: 0, assignments: 0, quizzes: 0 };
	(mods || []).forEach((m) => {
		(m.items || []).forEach((it) => {
			const t = String(it.type || '').toLowerCase();
			if (t === 'video') out.videos += 1;
			else if (t === 'reading' || t === 'doc' || t === 'link')
				out.documentation += 1;
			else if (t === 'assignment') out.assignments += 1;
			else if (t === 'quiz') out.quizzes += 1;
		});
	});
	return out;
}
function computeTotalMinutesFromModules(mods) {
	let total = 0;
	(mods || []).forEach((m) => {
		(m.items || []).forEach((it) => {
			const mins = Number(it.estimatedMinutes);
			if (Number.isFinite(mins) && mins > 0) total += mins;
		});
	});
	return total;
}

// --- existing create/update/delete/attach (unchanged) ---
async function createCourse(req, res, next) {
	try {
		const { userId, name, email } = getAuthIdentity(req);
		if (!userId) return res.status(401).json({ message: 'Unauthorized' });

		const raw =
			typeof req.body.meta === 'string'
				? JSON.parse(req.body.meta)
				: (req.body ?? {});
		const p = raw || {};

		const title = (p.title ?? '').trim();
		if (!title) return res.status(400).json({ message: 'Title is required' });

		const author = name || email || 'Unknown';
		const modules = asArray(p.modules);
		const counts = computeCountsFromModules(modules);
		const totalEstimatedMinutes = computeTotalMinutesFromModules(modules);

		const t = p.thumbnail || {};
		let thumbnail = {
			mode: t.mode === 'upload' ? 'upload' : 'link',
			link: t.mode === 'link' ? t.link || '' : '',
			fileName: t.fileName || '',
		};
		if (req.file) {
			thumbnail = {
				mode: 'upload',
				link: '',
				fileName: req.file.originalname || thumbnail.fileName,
				mimeType: req.file.mimetype || thumbnail.mimeType,
				sizeBytes: typeof req.file.size === 'number' ? req.file.size : undefined,
				storageKey: '',
				etag: '',
			};
		}

		const course = await Course.create({
			owner: userId,
			author,
			title,
			description: p.description ?? '',
			learningOutcomes: asArray(p.learningOutcomes),
			thumbnail,
			modules,
			totalEstimatedMinutes,
			counts,
		});

		try {
			await Instructor.findOneAndUpdate(
				{ userId },
				{ $addToSet: { coursesCreated: course._id } },
				{ upsert: false },
			);
		} catch (_) {}

		return res.status(201).json(course);
	} catch (err) {
		next(err);
	}
}

async function listMyCourses(req, res, next) {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ message: 'Unauthorized' });
		const docs = await Course.find({ owner: userId }).sort({
			createdAt: -1,
		});
		return res.json(docs);
	} catch (err) {
		next(err);
	}
}

async function getMyCourseById(req, res, next) {
	try {
		console.log('inside getMyCourseById');
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ message: 'Unauthorized' });
		const { id } = req.params;
		if (!mongoose.isValidObjectId(id)) {
			return res.status(400).json({ message: 'Invalid course id' });
		}
		console.log('id:', id, 'userId:', userId);
		const doc = await Course.findOne({ _id: id });
		if (!doc) return res.status(404).json({ message: 'Course not found' });
		return res.status(200).json(doc);
	} catch (err) {
		next(err);
	}
}

async function updateMyCourse(req, res, next) {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ message: 'Unauthorized' });
		const { id } = req.params;
		if (!mongoose.isValidObjectId(id)) {
			return res.status(400).json({ message: 'Invalid course id' });
		}
		const {
			owner,
			author,
			_id,
			id: clientId,
			assignments,
			quizzes,
			...payload
		} = req.body ?? {};

		if (Array.isArray(payload.modules)) {
			payload.counts = computeCountsFromModules(payload.modules);
			payload.totalEstimatedMinutes = computeTotalMinutesFromModules(
				payload.modules,
			);
		}

		const updated = await Course.findOneAndUpdate(
			{ _id: id, owner: userId },
			{ $set: payload },
			{ new: true },
		);
		if (!updated) return res.status(404).json({ message: 'Course not found' });
		return res.json(updated);
	} catch (err) {
		next(err);
	}
}

async function deleteMyCourse(req, res, next) {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ message: 'Unauthorized' });
		const { id } = req.params;
		if (!mongoose.isValidObjectId(id)) {
			return res.status(400).json({ message: 'Invalid course id' });
		}
		const removed = await Course.findOneAndDelete({
			_id: id,
			owner: userId,
		});
		if (!removed) return res.status(404).json({ message: 'Course not found' });
		return res.status(204).send();
	} catch (err) {
		next(err);
	}
}

async function attachItemToModule(req, res, next) {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ message: 'Unauthorized' });

		const { courseId, moduleIndex } = req.params;
		const { type, refId } = req.body ?? {};
		if (!['assignment', 'quiz'].includes(type)) {
			return res.status(400).json({ message: 'Unsupported item type' });
		}
		if (!mongoose.isValidObjectId(courseId)) {
			return res.status(400).json({ message: 'Invalid course id' });
		}
		const idx = Number(moduleIndex);
		if (!Number.isFinite(idx) || idx < 0) {
			return res.status(400).json({ message: 'Invalid module index' });
		}
		if (!mongoose.isValidObjectId(refId)) {
			return res.status(400).json({ message: 'Invalid refId' });
		}

		let doc;
		if (type === 'assignment') {
			doc = await Assignment.findOne({ _id: refId, owner: userId });
		} else if (type === 'quiz') {
			doc = await Quiz.findOne({ _id: refId, owner: userId });
		}
		if (!doc) return res.status(404).json({ message: `${type} not found` });

		const item = {
			type,
			title: doc.title,
			estimatedMinutes: Number(doc.estimatedMinutes) || 0,
			url: '',
			refId: doc.id,
		};
		const countersInc = {
			totalEstimatedMinutes: item.estimatedMinutes,
			[`counts.${type === 'assignment' ? 'assignments' : 'quizzes'}`]: 1,
		};
		const course = await attachItemToCourse({
			userId,
			courseId,
			moduleIndex: idx,
			item,
			countersInc,
		});
		const lightweight = {
			id: doc.id,
			type,
			title: doc.title,
			estimatedMinutes: item.estimatedMinutes,
		};
		return res.status(201).json({ ok: true, course, item: lightweight });
	} catch (err) {
		next(err);
	}
}

/** UPDATED: GET /edstream/courses?scope=enrolled|created|authored|all */
async function listCourses(req, res) {
	try {
		const scope = String(req.query.scope || '').toLowerCase();

		// ✅ NEW: public/all catalog branch
		if (!scope || scope === 'all') {
			const list = await Course.find({})
				.select('title author thumbnail.link counts totalEstimatedMinutes')
				.lean();

            // Get enrollment counts for all courses
            const courseIds = list.map((c) => c._id);
            const enrollments = await Enrollment.aggregate([
                { $match: { course: { $in: courseIds }, role: "learner" } },
                { $group: { _id: "$course", count: { $sum: 1 } } },
            ]);
            const enrollmentCountByCourse = {};
            enrollments.forEach((e) => {
                enrollmentCountByCourse[e._id.toString()] = e.count;
            });

			const data = (list || []).map((c) => ({
				...c,
				thumbnail: c?.thumbnail?.link || '',
				id: c._id,
                learners: enrollmentCountByCourse[c._id.toString()] || 0,
			}));
			return res.json({ ok: true, data });
		}

		// existing scoped branches (enrolled/created/authored)
		if (scope === 'enrolled' && req.user?.role === 'learner') {
			const prof = await Learner.findOne({ userId: req.user.id }).lean();
			const ids = prof?.coursesEnrolled || [];
			const list = await Course.find({ _id: { $in: ids } })
				.select('title author thumbnail.link counts totalEstimatedMinutes')
				.lean();

            // Get enrollment counts for these courses
            const courseIds = list.map((c) => c._id);
            const enrollments = await Enrollment.aggregate([
                { $match: { course: { $in: courseIds }, role: "learner" } },
                { $group: { _id: "$course", count: { $sum: 1 } } },
            ]);
            const enrollmentCountByCourse = {};
            enrollments.forEach((e) => {
                enrollmentCountByCourse[e._id.toString()] = e.count;
            });

			const data = (list || []).map((c) => ({
				...c,
				thumbnail: c?.thumbnail?.link || '',
				id: c._id,
                learners: enrollmentCountByCourse[c._id.toString()] || 0,
			}));
			return res.json({ ok: true, data });
		}

		if (scope === 'created' && req.user?.role === 'instructor') {
			const prof = await Instructor.findOne({
				userId: req.user.id,
			}).lean();
			const ids = prof?.coursesCreated || [];
			const list = await Course.find({ _id: { $in: ids } })
				.select('title author thumbnail.link counts totalEstimatedMinutes')
				.lean();

            // Get enrollment counts for these courses
            const courseIds = list.map((c) => c._id);
            const enrollments = await Enrollment.aggregate([
                { $match: { course: { $in: courseIds }, role: "learner" } },
                { $group: { _id: "$course", count: { $sum: 1 } } },
            ]);
            const enrollmentCountByCourse = {};
            enrollments.forEach((e) => {
                enrollmentCountByCourse[e._id.toString()] = e.count;
            });

			const data = (list || []).map((c) => ({
				...c,
				thumbnail: c?.thumbnail?.link || '',
				id: c._id,
                learners: enrollmentCountByCourse[c._id.toString()] || 0,
			}));
			return res.json({ ok: true, data });
		}

		if (scope === 'authored' && req.user?.role === 'instructor') {
			const list = await Course.find({ author: req.user.name })
				.select('title author thumbnail.link counts totalEstimatedMinutes')
				.lean();

            // Get enrollment counts for these courses
            const courseIds = list.map((c) => c._id);
            const enrollments = await Enrollment.aggregate([
                { $match: { course: { $in: courseIds }, role: "learner" } },
                { $group: { _id: "$course", count: { $sum: 1 } } },
            ]);
            const enrollmentCountByCourse = {};
            enrollments.forEach((e) => {
                enrollmentCountByCourse[e._id.toString()] = e.count;
            });

			const data = (list || []).map((c) => ({
				...c,
				thumbnail: c?.thumbnail?.link || '',
				id: c._id,
                learners: enrollmentCountByCourse[c._id.toString()] || 0,
			}));
			return res.json({ ok: true, data });
		}

		// Fallback: nothing matched (e.g., role mismatch)
		return res.json({ ok: true, data: [] });
	} catch (e) {
		return res.status(500).json({ ok: false, error: 'Failed to list courses' });
	}
}

/** GET /edstream/courses/:id?expand=1 */
async function getCourse(req, res) {
	try {
		const { id } = req.params;
		if (!mongoose.isValidObjectId(id)) {
			return res.status(400).json({ ok: false, error: 'Invalid id' });
		}
		const course = await Course.findById(id).lean();
		if (!course) return res.status(404).json({ ok: false, error: 'Not found' });

		if (String(req.query.expand) === '1') {
			for (const m of course.modules || []) {
				for (const it of m.items || []) {
					if (it.type === 'assignment' && it.refId)
						it.to = `/assignment/${it.refId}`;
					if (it.type === 'quiz' && it.refId) it.to = `/quiz/${it.refId}`;
				}
			}
		}

		course.thumbnail = course?.thumbnail?.link || '';

        // Get enrollment count for this course
        const enrollments = await Enrollment.aggregate([
            { $match: { course: course._id, role: "learner" } },
            { $group: { _id: "$course", count: { $sum: 1 } } },
        ]);

        // DEBUG: Log enrollment query results
        console.log("CourseController - courseId:", course._id);
        console.log("CourseController - enrollments:", enrollments);

        course.learners = enrollments.length > 0 ? enrollments[0].count : 0;
        console.log("CourseController - learners set to:", course.learners);

		return res.json({ ok: true, data: course });
	} catch (e) {
		return res.status(500).json({ ok: false, error: 'Failed to get course' });
	}
}
// controllers/CourseController.js  (ADD THIS FUNCTION)
async function enrollCourse(req, res) {
    try {
        // Must be authenticated & a learner
        if (!req.user?.id) {
            return res.status(401).json({ ok: false, error: "Unauthorized" });
        }
        if (req.user?.role !== "learner") {
            return res
                .status(403)
                .json({ ok: false, error: "Only learners can enroll" });
        }

        const { id } = req.params; // course id
        if (!mongoose.isValidObjectId(id)) {
            return res
                .status(400)
                .json({ ok: false, error: "Invalid course id" });
        }

        // Optional: ensure the course exists
        const exists = await Course.exists({ _id: id });
        if (!exists) {
            return res
                .status(404)
                .json({ ok: false, error: "Course not found" });
        }

        // Upsert learner profile & add the course
        const updated = await Learner.findOneAndUpdate(
            { userId: req.user.id },
            {
                $addToSet: { coursesEnrolled: id },
                // if learner doc not found, create a minimal one
                $setOnInsert: { domainInterest: [] },
            },
            { new: true, upsert: true },
        ).lean();

		const enrollment = await Enrollment.findOneAndUpdate(
			{ user: req.user.id  },
			{
				$set: {
					course: id,
					user: req.user.id,
					role: 'learner',
				},
			},
			{ new: true, upsert: true },
		);
		console.log('Enrollment upserted:', enrollment);

		// Send forum notification to instructors about the enrollment
		try {
			const courseDoc = await Course.findById(id).lean();
			await forumController.notifyCourseEnrollment(
				{
					body: {
						courseId: id,
						courseTitle: courseDoc?.title || 'Unknown Course',
						learnerEmail: req.user.email || '',
						learnerName: req.user.name || 'A learner',
						learnerUserId: req.user.id,
					},
				},
				{
					status: () => ({
						json: () => {},
					}),
				},
			);
		} catch (notifErr) {
			// Log the error but don't fail the enrollment
			console.error('Failed to send enrollment notification:', notifErr);
		}

        return res.json({
            ok: true,
            data: {
                enrolled: true,
                courseId: id,
                coursesEnrolled: updated?.coursesEnrolled ?? [],
            },
        });
    } catch (e) {
        return res.status(500).json({ ok: false, error: "Failed to enroll" });
    }
}

// async function enrollCourse(req, res) {
//     try {
//         // Must be authenticated & a learner
//         if (!req.user?.id) {
//             return res.status(401).json({ ok: false, error: "Unauthorized" });
//         }
//         if (req.user?.role !== "learner") {
//             return res
//                 .status(403)
//                 .json({ ok: false, error: "Only learners can enroll" });
//         }

//         const { id: courseId } = req.params;
//         if (!mongoose.isValidObjectId(courseId)) {
//             return res
//                 .status(400)
//                 .json({ ok: false, error: "Invalid course id" });
//         }

//         // Ensure the course exists
//         const exists = await Course.exists({ _id: courseId });
//         if (!exists) {
//             return res
//                 .status(404)
//                 .json({ ok: false, error: "Course not found" });
//         }

//         // 1) Update learner profile (existing behavior)
//         const learnerDoc = await Learner.findOneAndUpdate(
//             { userId: req.user.id },
//             {
//                 $addToSet: { coursesEnrolled: courseId },
//                 $setOnInsert: { domainInterest: [] }, // minimal profile if not present yet
//             },
//             { new: true, upsert: true },
//         ).lean();

//         // 2) Ensure Enrollment row exists (course, user, role='learner')
//         //    Your Enrollment model has unique index on { course, user }, so this is idempotent.
//         //    If you later extend the schema with extra fields, set them in $setOnInsert below.
//         await Enrollment.findOneAndUpdate(
//             { course: courseId, user: req.user.id },
//             {
//                 $set: {
//                     course: courseId, // explicitly persisted
//                     user: req.user.id,
//                     role: "learner",
//                 }, // required property in your schema
//                 // $setOnInsert: {
//                 //     // Optional extra fields if you add them in the schema (see section 3):
//                 //     // enrolledAt: new Date(),
//                 //     // status: 'active',
//                 //     // source: 'self-service',
//                 // },
//             },
//             { new: true, upsert: true },
//         );

//         return res.json({
//             ok: true,
//             data: {
//                 enrolled: true,
//                 courseId,
//                 // keep returning the learner's courses for UI convenience
//                 coursesEnrolled: learnerDoc?.coursesEnrolled ?? [],
//             },
//         });
//     } catch (e) {
//         // Handle duplicate key gracefully (in case of race condition on unique index)
//         if (e?.code === 11000) {
//             return res.status(200).json({
//                 ok: true,
//                 data: {
//                     enrolled: true,
//                     courseId: req.params.id,
//                     info: "Already enrolled",
//                 },
//             });
//         }
//         return res.status(500).json({ ok: false, error: "Failed to enroll" });
//     }
// }

/**
 * PATCH /edstream/courses/:id/modules/:moduleIndex
 * Update a specific module's title and description
 * Body: { title, description }
 */
async function updateModule(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ ok: false, error: "Unauthorized" });
        }

        const { id, moduleIndex } = req.params;
        if (!mongoose.isValidObjectId(id)) {
            return res
                .status(400)
                .json({ ok: false, error: "Invalid course id" });
        }

        const idx = Number(moduleIndex);
        if (!Number.isFinite(idx) || idx < 0) {
            return res
                .status(400)
                .json({ ok: false, error: "Invalid module index" });
        }

        const { title, description } = req.body ?? {};

        // Build the update object
        const updateFields = {};
        if (title !== undefined) {
            updateFields[`modules.${idx}.title`] = title;
        }
        if (description !== undefined) {
            updateFields[`modules.${idx}.description`] = description;
        }

        if (Object.keys(updateFields).length === 0) {
            return res
                .status(400)
                .json({ ok: false, error: "No fields to update" });
        }

        const updated = await Course.findOneAndUpdate(
            { _id: id, owner: userId },
            { $set: updateFields },
            { new: true },
        );

        if (!updated) {
            return res
                .status(404)
                .json({ ok: false, error: "Course not found" });
        }

        return res.json({ ok: true, data: updated });
    } catch (e) {
        console.error("updateModule error:", e);
        return res
            .status(500)
            .json({ ok: false, error: "Failed to update module" });
    }
}

module.exports = {
	createCourse,
	listMyCourses,
	getMyCourseById,
	updateMyCourse,
	deleteMyCourse,
	attachItemToModule,
	enrollCourse,
	// read endpoints
	listCourses,
	getCourse,
    // new
    updateModule,
};
