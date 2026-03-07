// index.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

dotenv.config();

const authRouter = require('./routes/authRouter');
const courseRoutes = require('./routes/courseRoutes');
const assignmentRoutes = require('./routes/assignment.routes');
const quizRoutes = require('./routes/quiz.routes');
const editProfileRouter = require('./routes/editProfile');

const learnerRoutes = require('./routes/learner.routes'); // NEW
const courseWorkRoutes = require('./routes/courseWork.routes'); // NEW
const instructorRoutes = require('./routes/instructor.routes');
const forumRoutes = require('./routes/forum.routes');

const app = express();

// JSON body parsing
app.use(express.json());

// CORS
app.use(
	cors({
		origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
		credentials: true,
	}),
);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'assignments');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connect
const MONGO_URI =
	process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/online_education_platform';

mongoose
	.connect(MONGO_URI)
	.then(() => console.log('MongoDB connected'))
	.catch((e) => console.error('MongoDB connection error', e));

// Routes
app.use('/edstream/auth', authRouter);
app.use('/edstream/courses', courseRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/edstream/assignments', assignmentRoutes);
app.use('/edstream/quizzes', quizRoutes);
app.use('/edstream/editProfile', editProfileRouter);
app.use('/edstream/learners', learnerRoutes);
app.use('/edstream/coursework', courseWorkRoutes);
app.use('/edstream/instructorDashboard', instructorRoutes); // NEW - instructor dashboard routes

// Forum routes
app.use('/edstream/forum', forumRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Start
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
