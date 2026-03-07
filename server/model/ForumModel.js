// server/model/ForumModel.js
const mongoose = require('mongoose');
const { Schema, model } = mongoose;

// Reply sub-document schema
const ReplySchema = new Schema(
	{
		replyId: { type: String, required: true },
		userId: { type: String, required: true },
		message: { type: String, required: true },
		timestamp: { type: Date, default: Date.now },
	},
	{ _id: false },
);

// Forum Post schema
const ForumPostSchema = new Schema(
	{
		postId: { type: String, required: true, index: true },
		courseId: { type: String, required: true, index: true },
		userId: { type: String, required: true, index: true },
		message: { type: String, required: true },
		timestamp: { type: Date, default: Date.now },
		replies: { type: [ReplySchema], default: [] },
	},
	{ timestamps: true },
);

// Forum notification schema
const ForumNotificationSchema = new Schema(
	{
		notificationId: { type: String, required: true, index: true },
		userId: { type: String, required: true, index: true },
		message: { type: String, required: true },
		type: { type: String, required: true },
		timestamp: { type: Date, default: Date.now },
		read: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

// Forum User schema (maps app users to forum users)
const ForumUserSchema = new Schema(
	{
		userId: { type: String, required: true, unique: true, index: true },
		name: { type: String, required: true },
		email: { type: String, required: true },
		role: { type: String, enum: ['learner', 'instructor'], default: 'learner' },
		enrolledCourseIds: [{ type: String }],
	},
	{ timestamps: true },
);

// Indexes for better query performance
ForumPostSchema.index({ courseId: 1, timestamp: -1 });
ForumNotificationSchema.index({ userId: 1, read: 1, timestamp: -1 });

const ForumPost = mongoose.models.ForumPost || model('ForumPost', ForumPostSchema);
const ForumNotification =
	mongoose.models.ForumNotification ||
	model('ForumNotification', ForumNotificationSchema);
const ForumUser = mongoose.models.ForumUser || model('ForumUser', ForumUserSchema);

module.exports = {
	ForumPost,
	ForumNotification,
	ForumUser,
};
