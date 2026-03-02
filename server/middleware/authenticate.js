// middleware/authenticate.js
const jwt = require('jsonwebtoken');
const User = require('../model/UserModel'); // adjust path if your models are elsewhere

/**
 * Common JWT auth middleware.
 * - Looks for Authorization: Bearer <token>
 * - Verifies token with process.env.JWT_SECRET
 * - Attaches req.user (Mongo user doc, password removed)
 *
 * If token is missing/invalid, responds with 401.
 */
module.exports = async function authenticate(req, res, next) {
  try {
    console.log("Auth Middleware: checking authorization header");
    const auth = req.headers.authorization || '';
    const isBearer = auth.startsWith('Bearer ');
    const token = isBearer ? auth.slice(7).trim() : null;
    console.log("Auth Middleware: token extracted", { token });
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized: token required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded may contain { id, email, role, iat, exp } based on how you sign the token

    // OPTIONAL but recommended: confirm the user still exists / still active
    // const user = await User.findById(decoded.id).lean();
    // if (!user) {
    //   return res.status(401).json({ ok: false, error: 'Unauthorized: user not found' });
    // }

    // Attach a safe user to the request
    const { password, ...safe } = user;
    req.user = safe; // e.g., { _id, name, email, role, ... }

    return next();
  } catch (err) {
    // Token expired or invalid signature, etc.
    return res.status(401).json({ ok: false, error: 'Unauthorized: invalid or expired token' });
  }
};