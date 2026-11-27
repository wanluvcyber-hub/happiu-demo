const jwt = require("jsonwebtoken");
const { getDb } = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "happiu-nu-dev-secret-2026-change-in-prod";
const JWT_EXPIRES_IN = "14d";

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      identifier: user.identifier,
      role: user.role,
      entityId: user.entity_id || user.entityId || null,
      displayName: user.display_name || user.displayName || ""
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function extractToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare("SELECT id, identifier, role, display_name, entity_id FROM users WHERE id = ?").get(payload.sub);
    req.user = user
      ? {
          id: user.id,
          identifier: user.identifier,
          role: user.role,
          displayName: user.display_name,
          entityId: user.entity_id
        }
      : null;
  } catch {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" });
    }
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: "บัญชีนี้ไม่มีสิทธิ์ใช้งานส่วนนี้" });
      }
      next();
    });
  };
}

module.exports = {
  JWT_SECRET,
  signToken,
  optionalAuth,
  requireAuth,
  requireRole
};
