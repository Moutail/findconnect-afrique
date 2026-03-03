const mongoose = require('../mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],

  publicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Publication',
  },

  chatRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatRequest',
  },

  lastMessage: {
    content: String,
    type: { type: String, enum: ['text', 'image', 'audio', 'video', 'system'] },
    senderId: mongoose.Schema.Types.ObjectId,
    sentAt: Date,
  },

  unreadCount: {
    type: Map,
    of: Number,
    default: new Map(),
  },

  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active',
  },

  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ publicationId: 1 });
conversationSchema.index({ updatedAt: -1 });

conversationSchema.methods.getOtherParticipant = function (userId) {
  return this.participants.find(p => p.toString() !== userId.toString());
};

module.exports = mongoose.model('Conversation', conversationSchema);
