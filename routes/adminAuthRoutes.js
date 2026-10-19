const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    if (!process.env.ADMIN_JWT_SECRET) return res.status(500).json({ message: "ADMIN_JWT_SECRET is not configured." });

    const normalizedEmail = String(email).trim().toLowerCase();
    let admin = await AdminUser.findOne({ email: normalizedEmail }).select("+passwordHash");

    // Bootstrap the first admin from backend environment variables.
    // For production, prefer a one-time seed script and remove this block.
    if (!admin && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD &&
        normalizedEmail === process.env.ADMIN_EMAIL.trim().toLowerCase() &&
        password === process.env.ADMIN_PASSWORD) {
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      try {
        admin = await AdminUser.create({
          name: process.env.ADMIN_NAME || "Capware Admin",
          email: normalizedEmail,
          passwordHash,
          role: "admin",
          isActive: true,
        });
        admin = await AdminUser.findById(admin._id).select("+passwordHash");
      } catch (err) {
        if (err.code === 11000) admin = await AdminUser.findOne({ email: normalizedEmail }).select("+passwordHash");
        else throw err;
      }
    }

    if (!admin || !admin.isActive) return res.status(401).json({ message: "Invalid credentials." });
    const valid = await bcrypt.compare(String(password), admin.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid credentials." });

    admin.lastLoginAt = new Date();
    await admin.save();
    const token = jwt.sign(
      { role: "admin", email: admin.email },
      process.env.ADMIN_JWT_SECRET,
      { subject: String(admin._id), expiresIn: "8h" }
    );
    res.json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
      expiresIn: 28800,
    });
  } catch (error) {
    console.error("Admin login failed:", error.message);
    res.status(500).json({ message: "Unable to sign in right now." });
  }
});

module.exports = router;
