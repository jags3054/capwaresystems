const mongoose = require("mongoose");

const researchEnquirySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 25, default: "" },
    affiliation: { type: String, trim: true, maxlength: 160, default: "" },
    researchLevel: { type: String, required: true, trim: true, maxlength: 80 },
    service: { type: String, required: true, trim: true, maxlength: 120 },
    domain: { type: String, required: true, trim: true, maxlength: 160 },
    topic: { type: String, trim: true, maxlength: 240, default: "" },
    supportNeeded: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
    budget: { type: String, trim: true, maxlength: 80, default: "" },
    deadline: { type: String, trim: true, maxlength: 100, default: "" },
    preferredContact: { type: String, trim: true, maxlength: 30, default: "Email" },
    consent: {
      type: Boolean,
      required: true,
      validate: {
        validator: (value) => value === true,
        message: "Consent is required.",
      },
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "In Discussion", "Quoted", "Converted", "Closed"],
      default: "New",
      index: true,
    },
    adminNotes: { type: String, trim: true, maxlength: 4000, default: "" },
    assignedTo: { type: String, trim: true, maxlength: 120, default: "" },
    lastContactedAt: { type: Date, default: null },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    // Admin-approved student payment
    amount: { type: Number, default: 0, min: 0 },
    priceApproved: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: ["Pending", "PAID", "Failed"],
      default: "Pending",
    },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    razorpaySignature: { type: String, default: "" },
    paymentVerifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

researchEnquirySchema.index({ createdAt: -1 });
researchEnquirySchema.index({ email: 1 });

module.exports = mongoose.model("ResearchEnquiry", researchEnquirySchema);
