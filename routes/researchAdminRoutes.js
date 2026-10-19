const express = require("express");
const mongoose = require("mongoose");
const ResearchEnquiry = require("../models/ResearchEnquiry");

const router = express.Router();
const allowedStatuses = new Set(["New", "Contacted", "In Discussion", "Quoted", "Converted", "Closed"]);
const editableFields = [
  "status",
  "adminNotes",
  "assignedTo",
  "amount",
  "priceApproved",
];

function safeEnquiry(doc) {
  return doc;
}

// IMPORTANT: Mount this router behind your existing admin authentication middleware.
// Example: app.use("/api/admin/research-enquiries", requireAdmin, researchAdminRoutes);

router.get("/", async (req, res) => {
  try {
    const filter = {};
    const requestedStatus = String(req.query.status || "all");
    if (requestedStatus !== "all") {
      if (!allowedStatuses.has(requestedStatus)) return res.status(400).json({ message: "Invalid status filter." });
      filter.status = requestedStatus;
    }

    const enquiries = await ResearchEnquiry.find(filter).sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ enquiries: enquiries.map(safeEnquiry) });
  } catch (error) {
    console.error("Admin research enquiry list failed:", error.message);
    return res.status(500).json({ message: "Unable to load research enquiries." });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid enquiry ID." });


    const updates = {};

    for (const field of editableFields) {
      if (!Object.prototype.hasOwnProperty.call(req.body, field)) {
        continue;
      }

      const value = req.body[field];

      if (field === "amount") {
        const amount = Number(value);

        if (!Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({
            message: "Payment amount must be greater than ₹0.",
          });
        }

        updates.amount = amount;
        continue;
      }

      if (field === "priceApproved") {
        if (typeof value !== "boolean") {
          return res.status(400).json({
            message: "Invalid price approval value.",
          });
        }

        updates.priceApproved = value;
        continue;
      }

      if (typeof value !== "string") {
        return res.status(400).json({
          message: `Invalid ${field}.`,
        });
      }

      updates[field] = value.trim();
    
  }

    if (!Object.keys(updates).length) return res.status(400).json({ message: "No supported fields were supplied." });
  if (updates.status && !allowedStatuses.has(updates.status)) return res.status(400).json({ message: "Invalid status value." });
  if (updates.adminNotes && updates.adminNotes.length > 4000) return res.status(400).json({ message: "Admin notes are too long." });
  if (updates.assignedTo && updates.assignedTo.length > 120) return res.status(400).json({ message: "Assigned name is too long." });
  if (updates.status === "Contacted") updates.lastContactedAt = new Date();

  const enquiry = await ResearchEnquiry.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true }).lean();
  if (!enquiry) return res.status(404).json({ message: "Research enquiry not found." });

  return res.json({ enquiry });
} catch (error) {
  console.error("Admin research enquiry update failed:", error.message);
  return res.status(500).json({ message: "Unable to update research enquiry." });
}
});

module.exports = router;
