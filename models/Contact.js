const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  name: String,
  email: String,
  mobile: String,
  subject: String,
  message: String,
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["New", "Contacted", "Qualified", "Converted", "Lost"],
    default: "New",
  },
  notes: {
    type: String,
    default: "",
  },

});

module.exports = mongoose.model('Contact', ContactSchema);
