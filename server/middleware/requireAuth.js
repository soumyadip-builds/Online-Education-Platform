const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const [scheme, token] = auth.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = jwt.verify(token, secret); // throws on invalid/expired

    // authenticationController signs payload with: sub, role, email
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      name: payload.name,
      _jwt: payload,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = { requireAuth };
