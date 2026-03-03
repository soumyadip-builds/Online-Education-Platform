// controllers/CourseController.js
const mongoose = require('mongoose');
const { Course } = require('../model/CourseModel');
const Instructor = require('../model/InstructorModel');
const Learner = require('../model/LearnerModel');
const Assignment = require('../model/AssignmentModel');
const Quiz = require('../model/QuizModel');
const { attachItemToCourse } = require('./_work.helpers');

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

// --- existing create/update/delete/attach retained from your file ---
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
		const docs = await Course.find({ owner: userId }).sort({ createdAt: -1 });
		return res.json(docs);
	} catch (err) {
		next(err);
	}
}

async function getMyCourseById(req, res, next) {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ message: 'Unauthorized' });
		const { id } = req.params;
		if (!mongoose.isValidObjectId(id)) {
			return res.status(400).json({ message: 'Invalid course id' });
		}
		const doc = await Course.findOne({ _id: id, owner: userId });
		if (!doc) return res.status(404).json({ message: 'Course not found' });
		return res.json(doc);
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
		const removed = await Course.findOneAndDelete({ _id: id, owner: userId });
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

/** NEW: GET /api/courses?scope=enrolled|created|authored */
async function listCourses(req, res) {
	try {
		const scope = String(req.query.scope || '').toLowerCase();
		let filter = {};

		if (scope === 'enrolled' && req.user?.role === 'learner') {
			const prof = await Learner.findOne({ userId: req.user.id }).lean();
			const ids = prof?.coursesEnrolled || [];
			filter = { _id: { $in: ids } };
		} else if (scope === 'created' && req.user?.role === 'instructor') {
			const prof = await Instructor.findOne({ userId: req.user.id }).lean();
			const ids = prof?.coursesCreated || [];
			filter = { _id: { $in: ids } };
		} else if (scope === 'authored' && req.user?.role === 'instructor') {
			filter = { author: req.user.name };
		}

		const list = await Course.find(filter)
			.select('title author thumbnail.link counts totalEstimatedMinutes')
			.lean();

		const data = (list || []).map((c) => ({
			...c,
			thumbnail: c?.thumbnail?.link || '',
			id: c._id,
		}));

		return res.json({ ok: true, data });
	} catch (e) {
		return res.status(500).json({ ok: false, error: 'Failed to list courses' });
	}
}

/** NEW: GET /api/courses/:id?expand=1 */
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
		return res.json({ ok: true, data: course });
	} catch (e) {
		return res.status(500).json({ ok: false, error: 'Failed to get course' });
	}
}

module.exports = {
	createCourse,
	listMyCourses,
	getMyCourseById,
	updateMyCourse,
	deleteMyCourse,
	attachItemToModule,
	// new read endpoints
	listCourses,
	getCourse,
};
