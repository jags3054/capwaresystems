const mongoose = require("mongoose");

const enrollSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  course: { type: String, required: true },
  enrolledAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Enroll", enrollSchema);
