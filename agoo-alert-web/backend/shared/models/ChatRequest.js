const mongoose = require('../mongoose');

const chatRequestSchema = new mongoose.Schema({
  publicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Publication',
    required: true,
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  message: {
    type: String,
    maxlength: [500, 'Le message ne peut pas dépasser 500 caractères'],
  },

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },

  respondedAt: Date,
  responseMessage: String,

  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
  },
}, {
  timestamps: true,
});

chatRequestSchema.index({ publicationId: 1, requesterId: 1 }, { unique: true });
chatRequestSchema.index({ targetUserId: 1, status: 1 });
chatRequestSchema.index({ requesterId: 1, status: 1 });

module.exports = mongoose.model('ChatRequest', chatRequestSchema);
