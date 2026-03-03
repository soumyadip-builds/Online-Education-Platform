// server/controller/AuthenticationController.js
const jwt = require("jsonwebtoken");

// ⬇️ Adjust these paths if your folder is "models" instead of "model"
const User = require("../model/UserModel");
const Instructor = require("../model/InstructorModel");
const Learner = require("../model/LearnerModel");

function signToken(user) {
  const payload = {
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
    name: user.name,
  };
  const secret = process.env.JWT_SECRET || "dev-secret";
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * POST /api/auth/register
 * Body: { name, email, password, role, dob?, gender? }
 * Flow (no transactions):
 *  1) create User
 *  2) create role profile (Instructor/Learner)
 *  3) if step 2 fails, delete step 1 (manual rollback)
 */
exports.register = async (req, res) => {
  const { name, email, password, role, dob, gender } = req.body || {};
  try {
    if (!name || !email || !password || !role) {
      return res.status(400).json({ ok: false, error: "Missing required fields." });
    }
    if (!["instructor", "learner"].includes(String(role))) {
      return res.status(400).json({ ok: false, error: "Invalid role." });
    }

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ ok: false, error: "Email already in use." });
    }

    // 1) Create user
    const user = new User({
      name,
      email,
      role,
      dob: dob ? new Date(dob) : undefined,
      gender,
    });
    await user.setPassword(password);
    await user.save();

    try {
      // 2) Create role profile
      if (role === "instructor") {
        await Instructor.create({
          userId: user._id,
          experienceYears: 0,
          skills: [],
          qualifications: [],
          coursesCreated: [],
        });
      } else {
        await Learner.create({
          userId: user._id,
          occupation: "",
          domainInterest: [],
          coursesEnrolled: [],
        });
      }
    } catch (profileErr) {
      // 3) Manual rollback (delete user if profile creation failed)
      try {
        await User.deleteOne({ _id: user._id });
      } catch (cleanupErr) {
        console.error("REGISTER_CLEANUP_ERROR:", cleanupErr);
      }
      throw profileErr;
    }

    // Populate the created profile so the frontend has it immediately
    await user.populate(role === "instructor" ? "instructor" : "learner");

    const token = signToken(user);
    const safeUser = user.toJSON(); // passwordHash stripped by schema transform

    return res.status(201).json({ ok: true, user: safeUser, token });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ ok: false, error: "Email already in use." });
    }
    console.error("REGISTER_ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error. Please try again." });
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Also populates the role profile.
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email and password are required." });
    }

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({ ok: false, error: "Invalid email or password." });
    }

    const ok = await user.validatePassword(password);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Invalid email or password." });
    }

    await user.populate(user.role === "instructor" ? "instructor" : "learner");

    const token = signToken(user);
    const safeUser = user.toJSON();

    return res.status(200).json({ ok: true, user: safeUser, token });
  } catch (err) {
    console.error("LOGIN_ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error. Please try again." });
  }
};