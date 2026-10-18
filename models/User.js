
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    college: {
      type: String,
      default: "",
      trim: true,
    },
    course: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: String,
      default: "",
    },

    selectedInternship: {
      type: String,
      required: true,
    },
    selectedPackage: {
      type: String,
      enum: ["Basic", "Internship", "Advanced"],
      required: true,
    },
    packagePrice: {
      type: Number,
      required: true,
    },
    selectedProject: {
      type: String,
      default: "",
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
    },
    enrollmentStatus: {
      type: String,
      enum: ["PENDING_PAYMENT", "ACTIVE"],
      default: "PENDING_PAYMENT",
    },

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
  },

  { timestamps: true }
);

module.exports =
  mongoose.models.User ||
  mongoose.model("User", userSchema);
