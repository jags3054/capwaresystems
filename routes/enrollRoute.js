const express = require("express");
const router = express.Router();
const Enroll = require("../models/Enroll");
const nodemailer = require("nodemailer");
require("dotenv").config(); // ✅ Ensure .env variables load



// ✅ Gmail SMTP setup using environment variables
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// POST /api/enroll
router.post("/", async (req, res) => {
  try {
    const { name, email, mobile, message, course } = req.body;

    if (!name || !email || !mobile || !course) {
      return res.status(400).json({ message: "All required fields must be filled." });
    }

    // Save to MongoDB
    const newEnroll = new Enroll({ name, email, mobile, message, course });
    await newEnroll.save();

    // 📧 Email to Admin
    await transporter.sendMail({
      from: `"Capware Enroll Bot" <${process.env.EMAIL_USER}>`,
      to: process.env.MAIL_USER,
      subject: `New Course Enrollment - ${course}`,
      html: `
        <h2>New Course Enrollment</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mobile:</strong> ${mobile}</p>
        <p><strong>Course:</strong> ${course}</p>
        <p><strong>Message:</strong> ${message || "—"}</p>
      `
    });

    // 📧 Confirmation Email to User
    await transporter.sendMail({
      from: `"Capware Systems" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `✅ Enrollment Confirmed for ${course}`,
      html: `
        <h3>Hello ${name},</h3>
        <p>Thanks for enrolling in <strong>${course}</strong>!</p>
        <p>We will contact you soon with further details.</p>
        <br/>
        <p>Warm Regards,<br/>Team Capware Systems</p>
      `
    });

    return res.status(200).json({ message: "Enrollment successful! Confirmation sent." });

  } catch (error) {
    console.error("Enrollment Error:", error);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
});

module.exports = router;
