const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  duration: { type: String, default: "" },
  fee: { type: Number, default: 1499, min: 0 },
  mode: { type: String, default: "Online" },
  status: { type: String, enum: ["active", "draft"], default: "active" },
}, { timestamps: true });
module.exports = mongoose.models.InternshipProgram || mongoose.model("InternshipProgram", schema);
