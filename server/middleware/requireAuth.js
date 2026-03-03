
// middleware/requireAuth.js
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const [scheme, token] = auth.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret); // throws on invalid/expired

    // Your AuthenticationController signs payload with: sub, role, email
    // We'll normalize to req.user = { id, role, email }
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      name: payload.name ,
      // include raw payload if you want
      _jwt: payload,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

module.exports = { requireAuth };