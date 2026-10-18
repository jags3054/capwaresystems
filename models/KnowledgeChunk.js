const mongoose = require('mongoose');
const KnowledgeChunkSchema = new mongoose.Schema({
  sourceType: { type: String, enum: ['faq', 'pdf', 'website'], default: 'faq', index: true },
  sourceName: { type: String, required: true, trim: true, maxlength: 180 },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  content: { type: String, required: true, maxlength: 12000 },
  keywords: [{ type: String, trim: true, lowercase: true, maxlength: 60 }],
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });
KnowledgeChunkSchema.index({ title: 'text', content: 'text', keywords: 'text' });
module.exports = mongoose.model('KnowledgeChunk', KnowledgeChunkSchema);
