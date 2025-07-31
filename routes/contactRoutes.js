const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const nodemailer = require('nodemailer');

// ✅ Setup transporter once at the top
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

// ✅ Contact Form Submission
router.post('/', async (req, res) => {
  const { name, email, mobile, subject, message } = req.body;

  try {
    // Save contact message to MongoDB
    const contact = new Contact({ name, email, mobile, subject, message });
    await contact.save();

    // ✅ Email to Admin
    const adminMailOptions = {
      from: `"Capware System" <${process.env.MAIL_USER}>`,
      to: process.env.MAIL_USER, // send to yourself
      subject: `New Inquiry from ${name}`,
      html: `
        <h3>New Service Inquiry</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mobile:</strong> ${mobile}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br/>${message}</p>
        <hr/>
        <p><strong>Action:</strong> Please follow up with ${name} regarding their inquiry.</p>
      `
    };

    await transporter.sendMail(adminMailOptions);
    console.log('✅ Admin email sent');

    // ✅ Email to Customer
    const userMailOptions = {
      from: `"Capware System" <${process.env.MAIL_USER}>`,
      to: email,
      subject: `Thanks for contacting Capware System`,
      html: `
        <h3>Hello ${name},</h3>
        <p>Thank you for reaching out to Capware System.</p>
        <p>We received the following details from you:</p>
        <ul>
          <li><strong>Subject:</strong> ${subject}</li>
          <li><strong>Message:</strong> ${message}</li>
        </ul>
        <p>We’ll get back to you shortly.</p>
        <br/>
        <p>Warm regards,<br/>Capware System Team</p>
      `
    };

    await transporter.sendMail(userMailOptions);
    console.log('✅ User confirmation email sent');

    res.status(201).json({ message: 'Message sent successfully!' });

  } catch (err) {
    console.error('❌ Error in contact route:', err);
    res.status(500).json({ message: 'Failed to send message.', error: err.message });
  }
});

module.exports = router;
