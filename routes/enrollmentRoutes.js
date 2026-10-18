
const express = require("express");
const mongoose = require("mongoose");
const Enrollment = require("../models/Enrollment");
const authMiddleware = require("../middelware/authMiddleware");
const PROJECTS = require("../config/projectsCatalogue");

const router = express.Router();

const INTERNSHIP_PACKAGES = {
  Basic: 1999,
  Internship: 2999,
  Advanced: 4999,
};

const INTERNSHIPS = {
  "full-stack-development": {
    name: "Full Stack Development Internship",
    projects: [
      "E-commerce Website",
      "Student Management System",
      "Job Portal",
      "Inventory Management System",
      "Food Ordering Website",
      "Blogging Platform",
    ],
  },

  "mobile-app-development": {
    name: "Mobile App Development Internship",
    projects: [
      "Food Delivery Mobile App",
      "Fitness Tracking Mobile App",
      "Expense Tracker Mobile App",
      "Event Booking Mobile App",
      "Student Companion Mobile App",
    ],
  },

  "genai-internship": {
    name: "GenAI Internship",
    projects: [
      "AI Chatbot",
      "Document Question Answering System",
      "AI Content Generator",
      "AI Resume Assistant",
      "AI Study Assistant",
    ],
  },

  "ai-ml-internship": {
    name: "AI/ML Internship",
    projects: [
      "AI Resume Screening & Job Recommendation",
      "Student Placement Prediction System",
      "Insurance Claim Fraud Detection",
      "Loan Approval Prediction System",
      "Customer Churn Prediction",
      "Real Estate Price Prediction",
      "AI Sales Forecasting System",
      "Student Performance Prediction",
      "Healthcare Disease Prediction",
      "AI Recommendation System",
    ],
  },
};

const SERVICES = {
  "website-development": {
    name: "Website Development",
    amount: 6999,
  },
  "mobile-app-development": {
    name: "Mobile App Development",
    amount: 14999,
  },
  "desktop-billing-applications": {
    name: "Desktop Billing",
    amount: 9999,
  },
  "online-classes": {
    name: "Online Classes",
    amount: 499,
  },
  workshops: {
    name: "Workshops",
    amount: 999,
  },
  internship: {
    name: "Internship",
    amount: 1499,
  },
  "final-year-project-guidance": {
    name: "Final Year Project Guidance",
    amount: 2999,
  },
};

// POST /api/enrollments
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { type, itemId, selectedPackage, project } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user account.",
      });
    }

    const normalizedType = String(type || "").trim().toLowerCase();
    const normalizedItemId = String(itemId || "").trim();

    if (
      typeof itemId !== "string" ||
      !normalizedItemId ||
      normalizedItemId.length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid item ID is required.",
      });
    }

    let enrollmentData;

    // INTERNSHIP ENROLLMENT
    if (normalizedType === "internship") {
      const internship = INTERNSHIPS[normalizedItemId];

      if (!internship) {
        return res.status(400).json({
          success: false,
          message: "The selected internship was not found.",
        });
      }

      if (
        typeof selectedPackage !== "string" ||
        !Object.prototype.hasOwnProperty.call(
          INTERNSHIP_PACKAGES,
          selectedPackage
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid internship package.",
        });
      }

      if (
        typeof project !== "string" ||
        !internship.projects.includes(project.trim())
      ) {
        return res.status(400).json({
          success: false,
          message: "Select a valid project for this internship.",
        });
      }

      const amount = INTERNSHIP_PACKAGES[selectedPackage];

      enrollmentData = {
        user: req.userId,
        type: "Internship",
        itemId: normalizedItemId,
        itemName: internship.name,
        selectedPackage,
        project: project.trim(),
        amount,
        paymentStatus: "PENDING",
        status: "PENDING",
      };
    }

    // PROJECT OR SERVICE ENROLLMENT
    else {
      let catalogue;
      let savedType;

      if (normalizedType === "project") {
        catalogue = PROJECTS;
        savedType = "Project";
      } else if (normalizedType === "service") {
        catalogue = SERVICES;
        savedType = "Service";
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid enrollment type.",
        });
      }

      const item = catalogue[normalizedItemId];

      if (!item) {
        return res.status(400).json({
          success: false,
          message: "The selected item was not found in the catalogue.",
        });
      }

      if (
        typeof item.name !== "string" ||
        !item.name.trim() ||
        !Number.isFinite(item.amount) ||
        item.amount < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "The selected item's name or price is not configured.",
        });
      }

      enrollmentData = {
        user: req.userId,
        type: savedType,
        itemId: normalizedItemId,
        itemName: item.name,
        amount: item.amount,
        paymentStatus: "PENDING",
        status: "PENDING",
      };
    }

    const enrollment = await Enrollment.create(enrollmentData);

    return res.status(201).json({
      success: true,
      message: "Enrollment submitted successfully.",
      enrollment: {
        _id: enrollment._id,
        type: enrollment.type,
        itemId: enrollment.itemId,
        itemName: enrollment.itemName,
        selectedPackage: enrollment.selectedPackage,
        project: enrollment.project,
        amount: enrollment.amount,
        paymentStatus: enrollment.paymentStatus,
        status: enrollment.status,
        createdAt: enrollment.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already enrolled in this item.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Enrollment creation error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to complete enrollment. Please try again.",
    });
  }
});

// GET /api/enrollments/my
router.get("/my", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user account.",
      });
    }

    const enrollments = await Enrollment.find({
      user: req.userId,
    }).sort({ createdAt: -1 });

    // Repair old zero-priced project records.
    for (const enrollment of enrollments) {
      if (
        enrollment.type === "Project" &&
        enrollment.amount === 0
      ) {
        const item = PROJECTS[enrollment.itemId];

        if (
          item &&
          Number.isFinite(item.amount) &&
          item.amount >= 0
        ) {
          enrollment.amount = item.amount;
          enrollment.itemName = item.name;
          await enrollment.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      enrollments,
    });
  } catch (error) {
    console.error("Fetch enrollments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch your enrollments.",
    });
  }
});

module.exports = router;
