const jwt = require("jsonwebtoken");
const User = require("../model/UserModel");

module.exports = async function authenticate(req, res, next) {
  try {
    console.log("Auth Middleware: checking authorization header");
    const auth = req.headers.authorization || "";
    const isBearer = auth.startsWith("Bearer ");
    const token = isBearer ? auth.slice(7).trim() : null;
    console.log("Auth Middleware: token extracted", { token });
    if (!token) {
      return res
        .status(401)
        .json({ ok: false, error: "Unauthorized: token required" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { password, ...safe } = user;
    req.user = safe; // { _id, name, email, role, ... }

    return next();
  } catch (err) {
    // token expired or invalid signature
    return res
      .status(401)
      .json({ ok: false, error: "Unauthorized: invalid or expired token" });
  }
};
