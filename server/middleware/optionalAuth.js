// middleware/optionalAuth.js
const jwt = require('jsonwebtoken');

function optionalAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return next();

    const token = auth.slice(7).trim();
    if (!token) return next();

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret);

    req.user = {
      id: payload.sub || payload.id,
      role: payload.role,
      email: payload.email,
      name: payload.name,
      _jwt: payload,
    };
    return next();
  } catch (_) {
    // Ignore invalid tokens for public routes
    return next();
  }
}

module.exports = { optionalAuth };