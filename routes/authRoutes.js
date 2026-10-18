
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const authMiddleware = require("../middelware/authMiddleware");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const router = express.Router();

const PACKAGE_PRICES = {
  Basic: 1999,
  Internship: 2999,
  Advanced: 4999,
};

const ALLOWED_INTERNSHIPS = [
  "Full Stack Development Internship",
  "Mobile App Development Internship",
  "GenAI Internship",
  "AI/ML Internship",
];

const FULL_STACK_PROJECTS = [
  "E-commerce Website",
  "Student Management System",
  "Job Portal",
  "Inventory Management System",
  "Food Ordering Website",
  "Blogging Platform",
];

function createToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    college: user.college,
    course: user.course,
    year: user.year,
    role: user.role,
    selectedInternship: user.selectedInternship,
    selectedPackage: user.selectedPackage,
    packagePrice: user.packagePrice,
    selectedProject: user.selectedProject,
    paymentStatus: user.paymentStatus,
    enrollmentStatus: user.enrollmentStatus,
  };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      mobile,
      college,
      course,
      year,
      selectedInternship,
      selectedPackage,
      project,
    } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !mobile?.trim() ||
      !college?.trim() ||
      !course?.trim() ||
      !year ||
      !selectedInternship ||
      !selectedPackage
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    if (!ALLOWED_INTERNSHIPS.includes(selectedInternship)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid internship.",
      });
    }

    if (!Object.hasOwn(PACKAGE_PRICES, selectedPackage)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid package.",
      });
    }

    const isFullStack = selectedInternship ===
      "Full Stack Development Internship";

    if (isFullStack && !FULL_STACK_PROJECTS.includes(project)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid Full Stack project.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      mobile: mobile.trim(),
      college: college.trim(),
      course: course.trim(),
      year,
      selectedInternship,
      selectedPackage,
      packagePrice: PACKAGE_PRICES[selectedPackage],
      selectedProject: isFullStack ? project : "",
      paymentStatus: "PENDING",
      enrollmentStatus: "PENDING_PAYMENT",
    });

    return res.status(201).json({
      success: true,
      message: "Student account created successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create account. Please try again.",
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account is disabled.",
      });
    }

    return res.json({
      success: true,
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to log in. Please try again.",
    });
  }
});


/* POST /api/auth/register-basic
   Create a minimal account for project/service enrollment.
*/
router.post("/register-basic", async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !password ||
      !mobile?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email, mobile and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email already has an account. Please log in.",
        code: "ACCOUNT_EXISTS",
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      mobile: mobile.trim(),

      // Defaults required by the current User schema.
      college: "",
      course: "Not provided",
      year: "",
      selectedInternship: "Not enrolled",
      selectedPackage: "Basic",
      packagePrice: 0,
      selectedProject: "",
      paymentStatus: "PENDING",
      enrollmentStatus: "PENDING_PAYMENT",
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token: createToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email already has an account. Please log in.",
        code: "ACCOUNT_EXISTS",
      });
    }

    console.error("Basic registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create your account. Please try again.",
    });
  }
});

router.patch("/profile", authMiddleware, async (req, res) => {
  try {
    const { name, mobile, college, course, year } = req.body;

    if (!name?.trim() || !mobile?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name and mobile number are required.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        $set: {
          name: name.trim(),
          mobile: mobile.trim(),
          college: college?.trim() || "",
          course: course?.trim() || "Not provided",
          year: year?.trim() || "",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student account not found.",
      });
    }

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Profile update error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update your profile.",
    });
  }
});


// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email address.",
      });
    }

    const user = await User.findOne({ email });

    // Do not reveal whether an account exists.
    const message =
      "If an account exists for this email, a password reset link will be sent.";

    if (!user) {
      return res.status(200).json({ success: true, message });
    }

    // Generate a cryptographically secure, single-use token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the token hash in the database.
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    const resetUrl =
      `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      const nodemailer = require("nodemailer");

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: user.email,
        subject: "Reset Your Capware Account Password",
        text: `You requested a password reset for your Capware account.

Open this link within 15 minutes:
${resetUrl}

If you did not request this, ignore this email.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:550px;margin:auto">
            <h2>Reset Your Password</h2>
            <p>You requested a password reset for your Capware account.</p>
            <p>This link expires in <strong>15 minutes</strong>.</p>
            <p>
              <a href="${resetUrl}"
                 style="display:inline-block;background:#2563eb;color:white;
                 padding:12px 20px;text-decoration:none;border-radius:6px">
                Reset Password
              </a>
            </p>
            <p>If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (emailError) {
      // Invalidate the token if email delivery fails.
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      console.error("Password reset email failed:", emailError.message);

      return res.status(500).json({
        success: false,
        message: "Unable to send the reset email. Please try again later.",
      });
    }

    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
});


// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid or has expired.",
      });
    }

    // Hash the new password before saving.
    user.password = await bcrypt.hash(password, 12);

    // Make the reset link single-use.
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset your password. Please try again.",
    });
  }
});

module.exports = router;
