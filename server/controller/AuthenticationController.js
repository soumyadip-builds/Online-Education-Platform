// server/controllers/AuthenticationController.js
const jwt = require("jsonwebtoken");
const User = require("../model/UserModel"); // adjust the relative path if different

/**
 * Helper: sign JWT
 * - Put JWT_SECRET and JWT_EXPIRES_IN (e.g., "7d") in your .env
 */
function signToken(user) {
    const payload = {
        sub: user._id.toString(),
        role: user.role,
        email: user.email,
    };
    const secret = process.env.JWT_SECRET || "dev-secret";
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    return jwt.sign(payload, secret, { expiresIn });
}

/**
 * POST /api/auth/register
 * Body: { name, email, password, role, dob?, gender? }
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, dob, gender } = req.body || {};

        // Basic checks (you can add zod/joi if you like)
        if (!name || !email || !password || !role) {
            return res
                .status(400)
                .json({ ok: false, error: "Missing required fields." });
        }

        // Check duplicate email
        const existing = await User.findOne({
            email: String(email).toLowerCase().trim(),
        });
        if (existing) {
            return res
                .status(409)
                .json({ ok: false, error: "Email already in use." });
        }

        // Create and set password hash via schema helper
        const user = new User({
            name,
            email,
            role,
            dob: dob ? new Date(dob) : undefined,
            gender,
        });

        await user.setPassword(password); // uses bcrypt under the hood
        await user.save();

        // Optional: Immediately sign in user after registration (toggle as needed)
        const token = signToken(user);

        // Sanitize output via toJSON (passwordHash is not exposed by schema)
        const safeUser = user.toJSON();

        // Optionally set httpOnly cookie (if same-origin or proper CORS configured)
        // res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7*24*60*60*1000 });

        return res.status(201).json({ ok: true, user: safeUser, token });
    } catch (err) {
        // Handle duplicate index errors defensively
        if (err && err.code === 11000) {
            return res
                .status(409)
                .json({ ok: false, error: "Email already in use." });
        }
        console.error("REGISTER_ERROR:", err);
        return res
            .status(500)
            .json({ ok: false, error: "Server error. Please try again." });
    }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res
                .status(400)
                .json({ ok: false, error: "Email and password are required." });
        }

        // passwordHash is select:false in your schema - explicitly select it for validation
        const user = await User.findOne({
            email: String(email).toLowerCase().trim(),
        }).select("+passwordHash");
        if (!user) {
            return res
                .status(401)
                .json({ ok: false, error: "Invalid email or password." });
        }

        const ok = await user.validatePassword(password);
        if (!ok) {
            return res
                .status(401)
                .json({ ok: false, error: "Invalid email or password." });
        }

        const token = signToken(user);
        const safeUser = user.toJSON(); // strips passwordHash

        // Optionally set httpOnly cookie (see comment in register)
        // res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7*24*60*60*1000 });

        return res.status(200).json({ ok: true, user: safeUser, token });
    } catch (err) {
        console.error("LOGIN_ERROR:", err);
        return res
            .status(500)
            .json({ ok: false, error: "Server error. Please try again." });
    }
};
