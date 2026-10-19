const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  price: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ["active", "draft"], default: "active" },
}, { timestamps: true });
module.exports = mongoose.models.Service || mongoose.model("Service", schema);
