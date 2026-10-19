const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, default: "", trim: true, lowercase: true },
  phone: { type: String, default: "", trim: true },
  interest: { type: String, default: "General" },
  message: { type: String, default: "" },
  source: { type: String, enum: ["website", "chatbot", "manual", "other"], default: "website" },
  status: { type: String, enum: ["new", "contacted", "qualified", "closed"], default: "new" },
  notes: { type: String, default: "" },
}, { timestamps: true });
module.exports = mongoose.models.Enquiry || mongoose.model("Enquiry", schema);
