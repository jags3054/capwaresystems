
const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");

const ResearchEnquiry = require("../models/ResearchEnquiry");
const User = require("../models/User");
const authMiddleware = require("../middelware/authMiddleware");

const router = express.Router();

const allowedServices = new Set([
  "Research Consultation",
  "Research Paper Support",
  "PhD Project Guidance",
  "Journal Publication Assistance",
  "Research Analytics",
]);

const text = (value) =>
  typeof value === "string" ? value.trim() : "";

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const error = new Error("Razorpay is not configured.");
    error.statusCode = 503;
    throw error;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function isEnquiryOwner(enquiry, userId) {
  return Boolean(
    userId &&
    enquiry.user &&
    String(enquiry.user) === String(userId)
  );
}

// Submit research enquiry
router.post("/enquiries", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Student account not found. Please log in again.",
      });
    }

    const fullName = text(req.body.fullName) || text(user.name);
    const email = (text(req.body.email) || text(user.email)).toLowerCase();
    const researchLevel = text(req.body.researchLevel);
    const service = text(req.body.service);
    const domain = text(req.body.domain);
    const supportNeeded = text(req.body.supportNeeded);

    if (
      !fullName ||
      !email ||
      !researchLevel ||
      !service ||
      !domain ||
      supportNeeded.length < 10
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields.",
      });
    }

    if (
      fullName.length > 100 ||
      email.length > 160 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid name and email address.",
      });
    }

    if (!allowedServices.has(service)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid research service.",
      });
    }

    if (req.body.consent !== true) {
      return res.status(400).json({
        success: false,
        message: "Please confirm consent before submitting.",
      });
    }

    const enquiry = await ResearchEnquiry.create({
      fullName,
      email,
      phone: text(req.body.phone).slice(0, 25) || text(user.mobile),
      affiliation: text(req.body.affiliation).slice(0, 160),
      researchLevel: researchLevel.slice(0, 80),
      service,
      domain: domain.slice(0, 160),
      topic: text(req.body.topic).slice(0, 240),
      supportNeeded: supportNeeded.slice(0, 3000),
      budget: text(req.body.budget).slice(0, 80),
      deadline: text(req.body.deadline).slice(0, 100),
      preferredContact:
        text(req.body.preferredContact).slice(0, 30) || "Email",
      consent: true,
      user: user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Research enquiry submitted successfully.",
      enquiryId: enquiry._id,
    });
  } catch (error) {
    console.error("Research enquiry submission failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to submit research enquiry.",
    });
  }
});

// Get logged-in student's enquiries
router.get("/my-enquiries", authMiddleware, async (req, res) => {
  try {
    const enquiries = await ResearchEnquiry.find({
      user: req.userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      enquiries,
    });
  } catch (error) {
    console.error("Fetching research enquiries failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch your research enquiries.",
    });
  }
});

// Create Razorpay payment order
router.post(
  "/:id/create-payment-order",
  authMiddleware,
  async (req, res) => {
    try {
      const enquiry = await ResearchEnquiry.findById(req.params.id);

      if (!enquiry) {
        return res.status(404).json({
          message: "Enquiry not found.",
        });
      }

      if (!isEnquiryOwner(enquiry, req.userId)) {
        return res.status(403).json({
          message: "You cannot pay for this enquiry.",
        });
      }

      if (
        enquiry.status !== "Converted" ||
        enquiry.priceApproved !== true ||
        !Number.isFinite(Number(enquiry.amount)) ||
        Number(enquiry.amount) <= 0
      ) {
        return res.status(400).json({
          message: "The payment amount has not been approved.",
        });
      }

      if (enquiry.paymentStatus === "PAID") {
        return res.status(409).json({
          message: "This enquiry has already been paid.",
        });
      }

      const razorpay = getRazorpay();

      const order = await razorpay.orders.create({
        amount: Math.round(Number(enquiry.amount) * 100),
        currency: "INR",
        receipt: `research_${String(enquiry._id).slice(-20)}`,
        notes: {
          enquiryId: String(enquiry._id),
        },
      });

      enquiry.razorpayOrderId = order.id;
      await enquiry.save();

      return res.status(200).json({
        key: process.env.RAZORPAY_KEY_ID,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
        },
      });
    } catch (error) {
      console.error("Create payment order error:", error);
      return res.status(error.statusCode || 500).json({
        message:
          error.statusCode === 503
            ? error.message
            : "Could not create payment order.",
      });
    }
  }
);

// Verify Razorpay payment
router.post("/verify-payment", authMiddleware, async (req, res) => {
  try {
    const {
      enquiryId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (
      !enquiryId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message: "Payment verification details are incomplete.",
      });
    }

    const enquiry = await ResearchEnquiry.findById(enquiryId);

    if (!enquiry) {
      return res.status(404).json({
        message: "Enquiry not found.",
      });
    }

    if (!isEnquiryOwner(enquiry, req.userId)) {
      return res.status(403).json({
        message: "You cannot verify payment for this enquiry.",
      });
    }

    if (enquiry.paymentStatus === "PAID") {
      return res.status(200).json({
        message: "This enquiry has already been paid.",
        paymentStatus: "PAID",
        amount: enquiry.amount,
      });
    }

    if (enquiry.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        message: "Payment order does not match this enquiry.",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        message: "Razorpay is not configured.",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const supplied = Buffer.from(String(razorpay_signature), "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (
      supplied.length !== expected.length ||
      !crypto.timingSafeEqual(supplied, expected)
    ) {
      return res.status(400).json({
        message: "Payment signature verification failed.",
      });
    }

    const razorpay = getRazorpay();
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    const expectedAmount = Math.round(Number(enquiry.amount) * 100);

    if (
      payment.order_id !== razorpay_order_id ||
      Number(payment.amount) !== expectedAmount ||
      payment.currency !== "INR" ||
      payment.status !== "captured"
    ) {
      return res.status(400).json({
        message: "Payment is not captured for the approved amount.",
      });
    }

    enquiry.paymentStatus = "PAID";
    enquiry.razorpayPaymentId = razorpay_payment_id;
    enquiry.razorpaySignature = razorpay_signature;
    enquiry.paymentVerifiedAt = new Date();

    await enquiry.save();

    return res.status(200).json({
      message: "Payment verified successfully.",
      paymentStatus: enquiry.paymentStatus,
      amount: enquiry.amount,
      paymentVerifiedAt: enquiry.paymentVerifiedAt,
      razorpayPaymentId: enquiry.razorpayPaymentId,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode === 503
          ? error.message
          : "Could not verify payment.",
    });
  }
});

module.exports = router;
