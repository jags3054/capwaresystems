const mongoose = require("mongoose");

const workshopRegistrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  workshopTitle: { type: String, required: true },
  message: { type: String },
  registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("WorkshopRegistration", workshopRegistrationSchema);
