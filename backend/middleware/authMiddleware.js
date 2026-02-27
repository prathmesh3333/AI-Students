const jwt = require("jsonwebtoken");

// ── Any logged-in user (student or teacher) ──────────────────
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }
};

// ── Teacher only ──────────────────────────────────────────────
const requireTeacher = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.role !== "teacher") {
      return res.status(403).json({ error: "Access denied. Teachers only." });
    }
    next();
  });
};

module.exports = { requireAuth, requireTeacher };
