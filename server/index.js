// index.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

// Load env FIRST (so CLIENT_ORIGIN/PORT/MONGO_URL are available everywhere)
dotenv.config();

const authRouter = require("./routes/authRouter");
const courseRoutes = require("./routes/courseRoutes");
const assignmentRoutes = require("./routes/assignment.routes");
const quizRoutes = require("./routes/quiz.routes");

const app = express();

// JSON body parsing
app.use(express.json());

// CORS (adjust origins for your client)
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

// MongoDB connect
const MONGO_URI =
  process.env.MONGO_URL ||
  "mongodb://127.0.0.1:27017/online_education_platform";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((e) => console.error("MongoDB connection error", e));

// Routes
app.use("/edstream/auth", authRouter);
app.use("/api/courses", courseRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/quizzes", quizRoutes);

// Health
app.get("/health", (_req, res) => res.json({ ok: true }));

// Start
const PORT = process.env.PORT || 5000; // your .env has 8000; this will pick that up
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
