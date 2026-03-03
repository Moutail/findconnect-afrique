const mongoose = require('../mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  content: {
    type: String,
    maxlength: [2000, 'Le message ne peut pas dépasser 2000 caractères'],
  },

  type: {
    type: String,
    enum: ['text', 'image', 'audio', 'video', 'system'],
    default: 'text',
  },

  attachment: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  readBy: [{
    userId: mongoose.Schema.Types.ObjectId,
    readAt: Date,
  }],

  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
}, {
  timestamps: true,
});

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

module.exports = mongoose.model('Message', messageSchema);
