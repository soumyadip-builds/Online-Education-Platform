// server/routes/forum.routes.js
const express = require('express');
const router = express.Router();
const forumController = require('../controller/forum.controller');

// User endpoints
router.get('/users', forumController.getUsers);
router.post('/users', forumController.upsertForumUser);

// Post endpoints
router.get('/posts', forumController.listPosts);
router.post('/posts', forumController.addPost);

// Reply endpoints
router.post('/posts/:postId/replies', forumController.addReply);

// Notification endpoints
router.get('/notifications', forumController.listNotifications);
router.patch('/notifications/:notificationId', forumController.markNotificationRead);
router.post('/notifications/enrollment', forumController.notifyCourseEnrollment);

// Get all forum data
router.get('/data', forumController.getAllData);

// Seed forum data from forum.json
router.post('/seed', forumController.seedForumData);

module.exports = router;
