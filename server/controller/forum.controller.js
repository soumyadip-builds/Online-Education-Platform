// server/controller/forum.controller.js
const { ForumPost, ForumNotification, ForumUser } = require('../model/ForumModel');
const mongoose = require('mongoose');

// Generate UUID-like ID
function generateId() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

// Infer notification type from message
function inferNotificationTypeFromMessage(msg) {
	const m = msg.toLowerCase();
	if (m.includes('[assignment due]')) return 'Assignment Due';
	if (m.includes('[new course]')) return 'New Course';
	if (m.includes('[announcement]')) return 'Announcement';
	return null;
}

// ==================== USER ENDPOINTS ====================

// GET /api/forum/users - Get all forum users
async function getUsers(req, res) {
	try {
		const users = await ForumUser.find().lean();
		return res.json(users);
	} catch (err) {
		console.error('getUsers error:', err);
		return res.status(500).json({ error: 'Failed to get users' });
	}
}

// POST /api/forum/users - Create or update a forum user
async function upsertForumUser(req, res) {
	try {
		const { userId, name, email, role, enrolledCourseIds } = req.body;

		if (!userId || !name || !email) {
			return res
				.status(400)
				.json({ error: 'userId, name, and email are required' });
		}

		const forumUser = await ForumUser.findOneAndUpdate(
			{ userId },
			{
				name,
				email,
				role: role || 'learner',
				enrolledCourseIds: enrolledCourseIds || [],
			},
			{ upsert: true, new: true, runValidators: true },
		);

		return res.json(forumUser);
	} catch (err) {
		console.error('upsertForumUser error:', err);
		return res.status(500).json({ error: 'Failed to create/update user' });
	}
}

// ==================== POST ENDPOINTS ====================

// GET /api/forum/posts?courseId=xxx - Get posts for a course
async function listPosts(req, res) {
	try {
		const { courseId } = req.query;
		const query = courseId ? { courseId } : {};

		const posts = await ForumPost.find(query).sort({ timestamp: -1 }).lean();

		return res.json(posts);
	} catch (err) {
		console.error('listPosts error:', err);
		return res.status(500).json({ error: 'Failed to get posts' });
	}
}

// POST /api/forum/posts - Create a new post
async function addPost(req, res) {
	try {
		const { courseId, userId, message } = req.body;

		if (!courseId || !userId || !message) {
			return res
				.status(400)
				.json({ error: 'courseId, userId, and message are required' });
		}

		const postId = generateId();
		const post = new ForumPost({
			postId,
			courseId,
			userId,
			message,
			timestamp: new Date(),
			replies: [],
		});

		await post.save();

		// Generate notifications if tagged
		const notifType = inferNotificationTypeFromMessage(message);
		if (notifType) {
			const allUsers = await ForumUser.find({ userId: { $ne: userId } }).lean();

			const notifications = allUsers.map((u) => ({
				notificationId: generateId(),
				userId: u.userId,
				message,
				type: notifType,
				timestamp: new Date(),
				read: false,
			}));

			if (notifications.length > 0) {
				await ForumNotification.insertMany(notifications);
			}
		}

		return res.status(201).json(post);
	} catch (err) {
		console.error('addPost error:', err);
		return res.status(500).json({ error: 'Failed to create post' });
	}
}

// ==================== REPLY ENDPOINTS ====================

// POST /api/forum/posts/:postId/replies - Add a reply to a post
async function addReply(req, res) {
	try {
		const { postId } = req.params;
		const { userId, message } = req.body;

		if (!userId || !message) {
			return res.status(400).json({ error: 'userId and message are required' });
		}

		const post = await ForumPost.findOne({ postId });
		if (!post) {
			return res.status(404).json({ error: 'Post not found' });
		}

		const reply = {
			replyId: generateId(),
			userId,
			message,
			timestamp: new Date(),
		};

		post.replies.push(reply);
		await post.save();

		return res.status(201).json(post);
	} catch (err) {
		console.error('addReply error:', err);
		return res.status(500).json({ error: 'Failed to add reply' });
	}
}

// ==================== NOTIFICATION ENDPOINTS ====================

// GET /api/forum/notifications?userId=xxx - Get notifications for a user
async function listNotifications(req, res) {
	try {
		console.log("inside listNotifications controller, query:", req.query);
		const { userId } = req.query;

		if (!userId) {
			return res.status(400).json({ error: 'userId is required' });
		}

		console.log('[listNotifications] Fetching notifications for userId:', userId);
		const notifications = await ForumNotification.find({ userId })
			.sort({ timestamp: -1 })
			.lean();

		console.log('[listNotifications] Found notifications:', notifications.length);
		return res.json(notifications);
	} catch (err) {
		console.error('listNotifications error:', err);
		return res.status(500).json({ error: 'Failed to get notifications' });
	}
}

// PATCH /api/forum/notifications/:notificationId - Mark notification as read
async function markNotificationRead(req, res) {
	try {
		const { notificationId } = req.params;

		const notification = await ForumNotification.findOneAndUpdate(
			{ notificationId },
			{ read: true },
			{ new: true },
		);

		if (!notification) {
			return res.status(404).json({ error: 'Notification not found' });
		}

		return res.json(notification);
	} catch (err) {
		console.error('markNotificationRead error:', err);
		return res.status(500).json({ error: 'Failed to mark notification as read' });
	}
}

// POST /api/forum/notifications/enrollment - Notify about course enrollment
async function notifyCourseEnrollment(req, res) {
	try {
		const { courseId, courseTitle, learnerEmail, learnerName, learnerUserId } =
			req.body;

		console.log('[notifyCourseEnrollment] ===== START =====');
		console.log('[notifyCourseEnrollment] Called with:', {
			courseId,
			courseTitle,
			learnerEmail,
			learnerName,
			learnerUserId,
		});

		if (!courseId || !learnerUserId) {
			console.log('[notifyCourseEnrollment] Missing required fields');
			return res
				.status(400)
				.json({ error: 'courseId and learnerUserId are required' });
		}

		// Find the course to get the owner/instructor
		const Course = require('../model/CourseModel');
		const course = await Course.findById(courseId).lean();

		console.log('[notifyCourseEnrollment] Course found:', course);

		if (!course) {
			console.log('[notifyCourseEnrollment] Course not found!');
			return res.status(404).json({ error: 'Course not found' });
		}

		console.log(
			'[notifyCourseEnrollment] Course owner (course.owner):',
			course.owner,
		);

		// Find the instructor by the course owner's userId
		const Instructor = require('../model/InstructorModel');
		const instructor = await Instructor.findOne({ userId: course.owner }).lean();

		console.log('[notifyCourseEnrollment] Instructor found:', instructor);

		if (!instructor) {
			console.log(
				'[notifyCourseEnrollment] No instructor found for course owner:',
				course.owner,
			);
			// Try to find all users and check
			const allUsers = await ForumUser.find().lean();
			console.log(
				'[notifyCourseEnrollment] All forum users:',
				JSON.stringify(allUsers),
			);
			return res.json({ ok: true, count: 0 });
		}

		// Get or create forum user for the instructor
		let forumInstructors = await ForumUser.find({ role: 'instructor' }).lean();
		console.log(
			'[notifyCourseEnrollment] Forum instructors (role=instructor):',
			forumInstructors,
		);

		// If no forum users with instructor role, try to find by the instructor's userId
		if (forumInstructors.length === 0) {
			// Check if there's a forum user with this userId
			const instructorUserIdStr = instructor.userId.toString();
			console.log(
				'[notifyCourseEnrollment] Looking for forum user with userId:',
				instructorUserIdStr,
			);
			const forumUser = await ForumUser.findOne({
				userId: instructorUserIdStr,
			}).lean();
			console.log('[notifyCourseEnrollment] Found forum user:', forumUser);
			if (forumUser) {
				forumInstructors = [forumUser];
			}
		}

		// If still no instructors found, create a notification for the course owner directly
		if (forumInstructors.length === 0) {
			console.log(
				'[notifyCourseEnrollment] Creating notification for course owner directly:',
				course.owner,
			);
			// Create notification directly for the course owner
			const notification = {
				notificationId: generateId(),
				userId: course.owner,
				message: `${learnerName || 'A learner'} enrolled in ${courseTitle || courseId}`,
				type: 'Course Enrollment',
				timestamp: new Date(),
				read: false,
			};
			console.log('[notifyCourseEnrollment] Creating notification:', notification);
			await ForumNotification.create(notification);
			console.log('[notifyCourseEnrollment] Notification created successfully');
			console.log('[notifyCourseEnrollment] ===== END =====');
			return res.json({ ok: true, count: 1 });
		}

		const notifications = forumInstructors.map((instructorForumUser) => ({
			notificationId: generateId(),
			userId: instructorForumUser.userId,
			message: `${learnerName || 'A learner'} enrolled in ${courseTitle || courseId}`,
			type: 'Course Enrollment',
			timestamp: new Date(),
			read: false,
		}));

		console.log('[notifyCourseEnrollment] Creating notifications:', notifications);

		if (notifications.length > 0) {
			await ForumNotification.insertMany(notifications);
		}

		console.log('[notifyCourseEnrollment] ===== END =====');
		return res.json({ ok: true, count: notifications.length });
	} catch (err) {
		console.error('[notifyCourseEnrollment] Error:', err);
		return res.status(500).json({ error: 'Failed to send enrollment notification' });
	}
}

// GET /api/forum/data - Get all forum data (for initial sync)
async function getAllData(req, res) {
	try {
		const [users, posts, notifications] = await Promise.all([
			ForumUser.find().lean(),
			ForumPost.find().lean(),
			ForumNotification.find().lean(),
		]);

		return res.json({
			users,
			forumPosts: posts,
			notifications,
		});
	} catch (err) {
		console.error('getAllData error:', err);
		return res.status(500).json({ error: 'Failed to get forum data' });
	}
}

// POST /api/forum/seed - Seed initial data from forum.json
async function seedForumData(req, res) {
	try {
		// Read the forum.json file
		const forumData = require('../../client/public/data/forum.json');

		// Seed users
		if (forumData.users && Array.isArray(forumData.users)) {
			for (const user of forumData.users) {
				await ForumUser.findOneAndUpdate(
					{ userId: user.userId },
					{
						userId: user.userId,
						name: user.name,
						email: user.email,
						role: user.role || 'learner',
						enrolledCourseIds: user.enrolledCourseIds || [],
					},
					{ upsert: true },
				);
			}
		}

		return res.json({ ok: true, message: 'Forum data seeded successfully' });
	} catch (err) {
		console.error('seedForumData error:', err);
		return res.status(500).json({ error: 'Failed to seed forum data' });
	}
}

module.exports = {
	getUsers,
	upsertForumUser,
	listPosts,
	addPost,
	addReply,
	listNotifications,
	markNotificationRead,
	notifyCourseEnrollment,
	getAllData,
	seedForumData,
};
