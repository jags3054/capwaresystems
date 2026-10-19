const mongoose = require('mongoose');
const ChatLeadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, maxlength: 180, default: '' },
  phone: { type: String, trim: true, maxlength: 30, default: '' },
  interest: { type: String, trim: true, maxlength: 120, default: 'General enquiry' },
  message: { type: String, trim: true, maxlength: 3000, default: '' },
  source: { type: String, default: 'website-chat', maxlength: 80 },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'closed'], default: 'new', index: true },
  assignedTo: { type: String, default: '' },
  conversationId: { type: String, default: '' },
  consentToContact: { type: Boolean, default: false },
}, { timestamps: true });
ChatLeadSchema.index({ createdAt: -1, status: 1 });
module.exports = mongoose.model('ChatLead', ChatLeadSchema);
