
const jwt = require("jsonwebtoken");

function readBearer(req) {
  const match = String(
    req.headers.authorization || ""
  ).match(/^Bearer\s+(.+)$/i);

  if (!match) return null;

  // Admin tokens are signed using ADMIN_JWT_SECRET.
  // Keep JWT_SECRET as a fallback only if both systems
  // intentionally share the same signing secret.
  const secret =
    process.env.ADMIN_JWT_SECRET ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "ADMIN_JWT_SECRET or JWT_SECRET must be configured."
    );
  }

  try {
    return jwt.verify(match[1], secret);
  } catch {
    return null;
  }
}

function getUserIdFromToken(req) {
  const payload = readBearer(req);

  const id =
    payload &&
    (payload.userId ||
      payload.id ||
      payload._id ||
      payload.sub);

  return id ? String(id) : null;
}

function requireAdmin(req, res, next) {
  try {
    const payload = readBearer(req);

    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Please sign in again.",
      });
    }

    const role = String(
      payload.role ||
        payload.userRole ||
        payload.accountType ||
        ""
    ).toLowerCase();

    const isAdmin =
      payload.isAdmin === true ||
      ["admin", "superadmin", "super_admin"].includes(role);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access is required.",
      });
    }

    req.chatAdmin = {
      id: String(
        payload.userId ||
          payload.id ||
          payload._id ||
          payload.sub ||
          ""
      ),
      role,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        error.message || "Authentication configuration error.",
    });
  }
}

module.exports = {
  getUserIdFromToken,
  requireAdmin,
};
