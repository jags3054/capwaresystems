const express = require("express");
const router = express.Router();
const WorkshopRegistration = require("../models/WorkshopRegistration");
const nodemailer = require("nodemailer");
require("dotenv").config();
// Replace this with your admin's email

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// POST /api/workshop
router.post("/", async (req, res) => {
  try {
    const { name, email, mobile, workshopTitle, message } = req.body;

    // Check required fields
    if (!name || !email || !mobile || !workshopTitle) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled." });
    }

    // Save to DB
    const newRegistration = new WorkshopRegistration({
      name,
      email,
      mobile,
      workshopTitle,
      message,
    });

    await newRegistration.save();

    // Send email to Admin
    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: process.env.MAIL_USER,
      subject: `📩 New Workshop Registration – ${workshopTitle}`,
      html: `
        <h3>New Workshop Registration</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mobile:</strong> ${mobile}</p>
        <p><strong>Workshop:</strong> ${workshopTitle}</p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
        <hr/>
        <p>Sent from Capware Systems website</p>
      `,
    });

    // Send confirmation email to User
    await transporter.sendMail({
      from: `"Capware Systems" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `✅ Registration Confirmed – ${workshopTitle}`,
      html: `
        <h3>Hello ${name},</h3>
        <p>Thank you for registering for the <strong>${workshopTitle}</strong> workshop.</p>
        <p>Our team will contact you soon with more details.</p>
        <br/>
        <p>– Capware Systems Team</p>
      `,
    });

    res
      .status(200)
      .json({ message: "Successfully registered! Confirmation email sent." });
  } catch (err) {
    console.error("Workshop registration error:", err);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
});

module.exports = router;
