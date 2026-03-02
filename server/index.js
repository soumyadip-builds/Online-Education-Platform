const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
// const router = require("./routes/userRoutes");
const cors = require("cors");

const authRouter = require("./routes/authRouter");
const editProfileRouter = require("./routes/editProfile");
const authenticate = require("./middleware/authenticate");

const app = express();

// Middlewares
app.use(express.json());

// CORS (adjust origins for your client)
app.use(
    cors({
        origin: process.env.CLIENT_ORIGIN || "http://localhost:5173", // Vite default
        credentials: true,
    }),
);

dotenv.config();

// MongoDB connect
const MONGO_URI = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/online_education_platform";
mongoose
    .connect(MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((e) => console.error("MongoDB connection error", e));

// Routes
app.use("/edstream/auth", authRouter);
app.get("/health", (req, res) => res.json({ ok: true }));


// ----- Common auth middleware for everything below -----
// app.use(authenticate);

app.use("/edstream/editProfile", editProfileRouter);

// Health

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
