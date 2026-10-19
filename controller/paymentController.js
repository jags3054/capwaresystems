
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Enrollment = require("../models/Enrollment");

const razorpay = () => {
  if (
    !process.env.RAZORPAY_KEY_ID ||
    !process.env.RAZORPAY_KEY_SECRET
  ) {
    const error = new Error(
      "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your backend .env file."
    );
    error.statusCode = 503;
    throw error;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// POST /api/payments/create-order
exports.createOrder = async (req, res) => {
  try {
    const userId = req.userId;
    const { enrollmentId } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        message: "Please log in to continue.",
      });
    }

    if (!enrollmentId) {
      return res.status(400).json({
        message: "enrollmentId is required.",
      });
    }

    // Find the enrollment belonging to the logged-in user.
    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      user: userId,
    });

    if (!enrollment) {
      return res.status(404).json({
        message: "Enrollment not found for this account.",
      });
    }

    if (
      String(enrollment.paymentStatus || "").toUpperCase() === "PAID"
    ) {
      return res.status(409).json({
        message: "This enrollment is already paid.",
      });
    }

    const amountRupees = Number(enrollment.amount);

    if (!Number.isFinite(amountRupees) || amountRupees <= 0) {
      return res.status(400).json({
        message:
          "This enrollment has an invalid payment amount. Please contact support.",
      });
    }

    const client = razorpay();

    const order = await client.orders.create({
      amount: Math.round(amountRupees * 100),
      currency: "INR",
      receipt: `enr_${String(enrollment._id).slice(-20)}_${Date.now()}`.slice(
        0,
        40
      ),
      notes: {
        enrollmentId: String(enrollment._id),
        userId: String(userId),
      },
    });

    // Save the order ID so payment verification can check the order.
    enrollment.razorpayOrderId = order.id;
    await enrollment.save();

    return res.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "Capware Systems",
      description:
        enrollment.itemName ||
        `${enrollment.type || "Service"} payment`,
      prefill: {},
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode && error.statusCode === 503
          ? error.message
          : "Unable to create payment order. Please try again.",
    });
  }
};

// POST /api/payments/verify
exports.verifyPayment = async (req, res) => {
  try {
    const userId = req.userId;

    const {
      enrollmentId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        message: "Please log in to continue.",
      });
    }

    if (
      !enrollmentId ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        message: "Missing payment verification details.",
      });
    }

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      user: userId,
    });

    if (!enrollment) {
      return res.status(404).json({
        message: "Enrollment not found for this account.",
      });
    }

    if (
      String(enrollment.paymentStatus || "").toUpperCase() === "PAID"
    ) {
      return res.json({
        success: true,
        paymentStatus: "PAID",
        message: "This enrollment is already paid.",
      });
    }

    if (enrollment.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        message: "The payment order does not match this enrollment.",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({
        message: "Razorpay is not configured on the server.",
      });
    }

    // Verify the signature using the secret stored on the backend.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(
      String(razorpay_signature),
      "hex"
    );

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        message: "Payment signature verification failed.",
      });
    }

    // Confirm the payment with Razorpay before marking it paid.
    const client = razorpay();
    const payment = await client.payments.fetch(razorpay_payment_id);

    if (payment.order_id !== enrollment.razorpayOrderId) {
      return res.status(400).json({
        message: "The payment does not belong to this order.",
      });
    }

    if (
      Number(payment.amount) !==
      Math.round(Number(enrollment.amount) * 100)
    ) {
      return res.status(400).json({
        message:
          "The verified payment amount does not match the enrollment amount.",
      });
    }

    if (payment.status !== "captured") {
      return res.status(409).json({
        message:
          "Payment is not captured yet. Please wait and check your dashboard.",
      });
    }

    enrollment.paymentStatus = "PAID";
    enrollment.razorpayPaymentId = razorpay_payment_id;
    enrollment.razorpaySignature = razorpay_signature;
    enrollment.paymentVerifiedAt = new Date();

    if (
      String(enrollment.status || "").toUpperCase() === "PENDING"
    ) {
      enrollment.status = "CONFIRMED";
    }

    await enrollment.save();

    return res.json({
      success: true,
      paymentStatus: "PAID",
      message: "Payment verified successfully.",
    });
  } catch (error) {
    console.error("Razorpay verify payment error:", error);

    return res.status(error.statusCode || 500).json({
      message:
        error.statusCode === 503
          ? error.message
          : "Unable to verify payment. Please contact support before retrying.",
    });
  }
};
