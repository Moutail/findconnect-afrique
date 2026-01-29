const mongoose = require('mongoose');

const chatRequestSchema = new mongoose.Schema({
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    required: true,
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  
  // Message d'introduction
  message: {
    type: String,
    maxlength: [500, 'Le message ne peut pas dépasser 500 caractères'],
  },
  
  // Statut
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  
  // Réponse
  respondedAt: Date,
  responseMessage: String,
  
  // Conversation créée (si acceptée)
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
  },
  
}, {
  timestamps: true,
});

// Index composé unique (un utilisateur ne peut demander qu'une fois par rapport)
chatRequestSchema.index({ reportId: 1, requesterId: 1 }, { unique: true });
chatRequestSchema.index({ status: 1 });

module.exports = mongoose.model('ChatRequest', chatRequestSchema);
