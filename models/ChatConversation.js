const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true, maxlength: 12000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  ownerKey: { type: String, default: null, select: false },
  title: { type: String, default: "New conversation", maxlength: 120 },
  messages: { type: [messageSchema], default: [] },
}, { timestamps: true });

conversationSchema.index({ userId: 1, updatedAt: -1 });
module.exports = mongoose.models.ChatConversation || mongoose.model("ChatConversation", conversationSchema);
