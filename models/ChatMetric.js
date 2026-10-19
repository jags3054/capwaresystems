const mongoose = require('mongoose');
const ChatMetricSchema = new mongoose.Schema({
  eventType: { type: String, enum: ['message', 'lead'], required: true, index: true },
  category: { type: String, default: 'general', trim: true, maxlength: 80, index: true },
  inputTokens: { type: Number, default: 0, min: 0 },
  outputTokens: { type: Number, default: 0, min: 0 },
  model: { type: String, default: '', maxlength: 100 },
  conversationId: { type: String, default: '', maxlength: 100 },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });
ChatMetricSchema.index({ eventType: 1, createdAt: -1 });
module.exports = mongoose.model('ChatMetric', ChatMetricSchema);
