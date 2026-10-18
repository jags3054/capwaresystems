
const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: { type: String, enum: ["Project", "Service", "Internship"], required: true },


    itemId: {
      type: String,
      required: true,
      trim: true,
    },

    itemName: {
      type: String,
      required: true,
      trim: true,
    },

    // Used for internship enrollments.
    selectedPackage: {
      type: String,
      enum: ["Basic", "Internship", "Advanced", null],
      default: null,
    },

    // Selected project within the internship domain.
    project: {
      type: String,
      trim: true,
      default: "",
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
    },

    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },

    razorpayOrderId: {
      type: String,
      default: null,
      index: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    razorpaySignature: {
      type: String,
      default: null,
    },

    paymentVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

enrollmentSchema.index(
  { user: 1, type: 1, itemId: 1 },
  { unique: true }
);

module.exports = mongoose.model("Enrollment", enrollmentSchema);
