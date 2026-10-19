
const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  const header = String(req.headers.authorization || "");
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({
      success: false,
      message: "Please sign in again.",
    });
  }

  if (!process.env.ADMIN_JWT_SECRET) {
    console.error("ADMIN_JWT_SECRET is not configured.");
    return res.status(500).json({
      success: false,
      message: "Admin authentication is not configured.",
    });
  }

  try {
    const payload = jwt.verify(
      match[1],
      process.env.ADMIN_JWT_SECRET
    );

    const role = String(
      payload.role || payload.userRole || payload.accountType || ""
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

    req.admin = {
      id: String(payload.sub || payload.userId || payload.id || payload._id || ""),
      email: payload.email || "",
      role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your admin session has expired. Please sign in again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid admin token. Please sign in again.",
    });
  }
}

module.exports = requireAdmin;
